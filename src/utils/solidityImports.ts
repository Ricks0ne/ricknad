/**
 * Solidity import resolution + standard-JSON-input builder.
 *
 * Contracts that use `@openzeppelin/contracts/...` imports cannot be
 * submitted to BaseScan as `solidity-single-file` — the server-side
 * compiler has no way to resolve `@openzeppelin/...` paths.
 *
 * Rather than flatten (which creates SPDX/pragma duplication and loses
 * structure), we fetch each imported file from unpkg and assemble a
 * `solidity-standard-json-input` payload. The server-side compiler
 * resolves imports against the `sources` map we provide, using the
 * exact string from each `import` statement as the key.
 *
 * References:
 *   https://docs.soliditylang.org/en/latest/using-the-compiler.html#compiler-input-and-output-json-description
 *   https://docs.etherscan.io/etherscan-v2/api-endpoints/contracts#verify-source-code
 */

/** Default OpenZeppelin version — pragma ^0.8.20+ implies OZ v5.x. */
export const DEFAULT_OZ_VERSION = "5.0.2";
export const DEFAULT_OZ_UPGRADEABLE_VERSION = "5.0.2";

const UNPKG_BASE = "https://unpkg.com";

/** Max files we'll fetch from the import graph before giving up. */
const MAX_IMPORT_FILES = 200;

export interface ImportStatement {
  /** The literal string between quotes in the import statement. */
  path: string;
  /** Character offset of the statement in the source. */
  offset: number;
}

/**
 * Extract every `import "..."` / `import ... from "..."` path in a Solidity
 * source. Comments are stripped first so `// import "..."` doesn't match.
 */
export const extractImports = (source: string): ImportStatement[] => {
  const stripped = stripComments(source);
  const imports: ImportStatement[] = [];
  const re = /^\s*import\s+(?:[^'";]*\s+from\s+)?["']([^"']+)["']\s*;/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stripped)) !== null) {
    imports.push({ path: match[1], offset: match.index });
  }
  return imports;
};

/** Return true if the source has at least one `import` statement. */
export const hasImports = (source: string): boolean => extractImports(source).length > 0;

/**
 * Return true if any import path is a "bare" package path that BaseScan
 * cannot resolve on its own (e.g. `@openzeppelin/...`, `@solmate/...`).
 * Relative paths (`./Foo.sol`, `../Bar.sol`) are excluded — those can be
 * resolved against other sources the user submits.
 */
export const hasExternalImports = (source: string): boolean => {
  return extractImports(source).some((imp) => isBarePackagePath(imp.path));
};

export const isBarePackagePath = (path: string): boolean => {
  if (path.startsWith("./") || path.startsWith("../")) return false;
  if (/^https?:\/\//.test(path)) return false;
  return true;
};

/** Strip `//` and `/* … *\/` comments so we don't match `import` inside them. */
const stripComments = (source: string): string => {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
};

/**
 * Resolve a relative import path (`./Foo.sol`, `../Bar.sol`) against the
 * directory of the file that contains the import.
 */
export const resolveRelative = (fromPath: string, relPath: string): string => {
  const dirParts = fromPath.split("/").slice(0, -1);
  const relParts = relPath.split("/");
  for (const part of relParts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (dirParts.length === 0) {
        throw new Error(`Cannot resolve '${relPath}' relative to '${fromPath}'`);
      }
      dirParts.pop();
    } else {
      dirParts.push(part);
    }
  }
  return dirParts.join("/");
};

/**
 * Map a bare package path (`@openzeppelin/contracts/.../Foo.sol`) to the
 * unpkg URL that serves its source. Versions for the two OZ packages are
 * configurable so users can match whatever version their contract was
 * generated against.
 */
export interface ResolveOptions {
  ozVersion?: string;
  ozUpgradeableVersion?: string;
}

export const resolveBareToUrl = (path: string, opts: ResolveOptions = {}): string => {
  const ozVersion = opts.ozVersion ?? DEFAULT_OZ_VERSION;
  const ozUp = opts.ozUpgradeableVersion ?? opts.ozVersion ?? DEFAULT_OZ_UPGRADEABLE_VERSION;

  if (path.startsWith("@openzeppelin/contracts-upgradeable/")) {
    const rest = path.slice("@openzeppelin/contracts-upgradeable/".length);
    return `${UNPKG_BASE}/@openzeppelin/contracts-upgradeable@${ozUp}/${rest}`;
  }
  if (path.startsWith("@openzeppelin/contracts/")) {
    const rest = path.slice("@openzeppelin/contracts/".length);
    return `${UNPKG_BASE}/@openzeppelin/contracts@${ozVersion}/${rest}`;
  }
  // Generic `@scope/name/rest` — best-effort latest.
  if (path.startsWith("@")) {
    const m = path.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
    if (m) return `${UNPKG_BASE}/${m[1]}/${m[2]}`;
  }
  throw new Error(`Unsupported import path: ${path}`);
};

export interface StandardJsonSources {
  [path: string]: { content: string };
}

export interface StandardJsonInput {
  language: "Solidity";
  sources: StandardJsonSources;
  settings: {
    optimizer: { enabled: boolean; runs: number };
    evmVersion?: string;
    outputSelection: Record<string, Record<string, string[]>>;
    metadata?: { useLiteralContent?: boolean };
  };
}

export interface BuildStandardJsonOptions {
  mainPath: string;
  mainSource: string;
  optimizationUsed: boolean;
  optimizerRuns: number;
  evmVersion?: string;
  ozVersion?: string;
  ozUpgradeableVersion?: string;
  /** Called once per fetched import path for progress reporting. */
  onFetch?: (path: string) => void;
}

/**
 * Walk the import graph starting at `mainSource`, fetching each bare-package
 * dependency from unpkg and each relative dependency by resolving against the
 * current file's path. Returns a ready-to-submit standard-JSON-input object.
 *
 * Fails fast if the graph exceeds MAX_IMPORT_FILES to avoid accidental
 * infinite loops when a package includes unexpected dependencies.
 */
export const buildStandardJsonInput = async (
  opts: BuildStandardJsonOptions,
): Promise<StandardJsonInput> => {
  const sources: StandardJsonSources = {};
  const visited = new Set<string>();
  const queue: Array<{ path: string; content?: string }> = [
    { path: opts.mainPath, content: opts.mainSource },
  ];

  while (queue.length > 0) {
    if (visited.size >= MAX_IMPORT_FILES) {
      throw new Error(
        `Import graph exceeds ${MAX_IMPORT_FILES} files — aborting to avoid runaway fetches.`,
      );
    }
    const item = queue.shift();
    if (!item) break;
    if (visited.has(item.path)) continue;
    visited.add(item.path);

    let content = item.content;
    if (content === undefined) {
      opts.onFetch?.(item.path);
      content = await fetchImportSource(item.path, {
        ozVersion: opts.ozVersion,
        ozUpgradeableVersion: opts.ozUpgradeableVersion,
      });
    }
    sources[item.path] = { content };

    for (const imp of extractImports(content)) {
      const resolved = resolveImportPath(item.path, imp.path);
      if (!visited.has(resolved)) {
        queue.push({ path: resolved });
      }
    }
  }

  return {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: opts.optimizationUsed,
        runs: opts.optimizerRuns,
      },
      evmVersion: opts.evmVersion,
      metadata: { useLiteralContent: true },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
        },
      },
    },
  };
};

/**
 * Given an import string found inside a file at `fromPath`, compute the
 * canonical path to use as the `sources` key. Relative imports resolve
 * against `fromPath`; bare imports are returned as-is (so `import "@oz/..."`
 * matches `sources["@openzeppelin/contracts/..."]`).
 */
export const resolveImportPath = (fromPath: string, importPath: string): string => {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return resolveRelative(fromPath, importPath);
  }
  return importPath;
};

const fetchImportSource = async (
  path: string,
  opts: ResolveOptions,
): Promise<string> => {
  const url = resolveBareToUrl(path, opts);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${path} (${response.status} ${response.statusText} from ${url})`,
    );
  }
  return await response.text();
};

/**
 * Sanity check: count each node in the import graph without fetching. Useful
 * for UI previews ("will fetch N files"). Only counts top-level imports,
 * does NOT recurse.
 */
export const countDirectImports = (source: string): { external: number; relative: number } => {
  const imports = extractImports(source);
  let external = 0;
  let relative = 0;
  for (const imp of imports) {
    if (isBarePackagePath(imp.path)) external += 1;
    else relative += 1;
  }
  return { external, relative };
};
