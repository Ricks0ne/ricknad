/**
 * Real Solidity compiler for Ricknad.
 *
 * Loads soljson (the canonical Solidity compiler binary) in a Web Worker
 * from binaries.soliditylang.org and compiles user contracts via the
 * standard-JSON input/output interface. Reuses `solidityImports.ts` to
 * fetch `@openzeppelin/...` deps from unpkg, so contracts with imports
 * compile end-to-end in the browser.
 *
 * The previous "compile" in ChatInterface.tsx was a regex-based fake that
 * set bytecode to a hardcoded sample unrelated to the user's Solidity —
 * which is why every Ricknad-deployed contract historically failed
 * BaseScan verification. This module replaces it with a real compile, so
 * the bytecode actually matches the source that gets submitted later.
 */

import {
  DEFAULT_OZ_VERSION,
  DEFAULT_OZ_UPGRADEABLE_VERSION,
  buildStandardJsonInput,
  hasExternalImports,
  type StandardJsonInput,
  type StandardJsonSources,
} from "./solidityImports";

/**
 * Default compiler version. Matches the `v0.8.20+commit.a1b79de6` option
 * exposed in the Verify dialog so compile + verify round-trip cleanly.
 */
export const DEFAULT_COMPILER_VERSION = "v0.8.20+commit.a1b79de6";

const SOLJSON_BASE = "https://binaries.soliditylang.org/bin";

export const compilerUrlFor = (version: string): string =>
  `${SOLJSON_BASE}/soljson-${version}.js`;

export interface CompileOptions {
  sourceCode: string;
  contractName: string;
  compilerVersion?: string;
  optimizerEnabled?: boolean;
  optimizerRuns?: number;
  evmVersion?: string;
  ozVersion?: string;
  ozUpgradeableVersion?: string;
  onFetchImport?: (path: string) => void;
}

export interface CompiledAbiItem {
  type: string;
  name?: string;
  inputs?: Array<{ name: string; type: string; internalType?: string; indexed?: boolean }>;
  outputs?: Array<{ name: string; type: string; internalType?: string }>;
  stateMutability?: string;
  anonymous?: boolean;
}

export interface CompileResult {
  /** Fully-qualified name, e.g. `contracts/MyToken.sol:MyToken`. */
  contractPath: string;
  /** Source-file key used in the sources map. */
  sourcePath: string;
  abi: CompiledAbiItem[];
  /** Hex-encoded creation bytecode, prefixed with `0x`. */
  bytecode: string;
  /** Solc metadata JSON string (with useLiteralContent). */
  metadata: string;
  /** Sources map that was fed to the compiler — includes OZ deps. */
  sources: StandardJsonSources;
}

interface SolcError {
  severity: "error" | "warning" | "info";
  formattedMessage?: string;
  message?: string;
  type?: string;
}

interface SolcOutput {
  errors?: SolcError[];
  contracts?: Record<
    string,
    Record<
      string,
      {
        abi: CompiledAbiItem[];
        evm: { bytecode: { object: string } };
        metadata: string;
      }
    >
  >;
}

interface WorkerResponse {
  id: string;
  ok: boolean;
  output?: SolcOutput;
  error?: string;
}

interface PendingJob {
  resolve: (output: SolcOutput) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
const pending = new Map<string, PendingJob>();

const getWorker = (): Worker => {
  if (worker) return worker;
  const w = new Worker("/solc-worker.js");
  w.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const { id, ok, output, error } = e.data;
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (ok && output) job.resolve(output);
    else job.reject(new Error(error ?? "Unknown compiler error"));
  };
  w.onerror = (e) => {
    // Reject all pending jobs — something catastrophic happened in the worker.
    const err = new Error(e.message || "Compiler worker crashed");
    for (const job of pending.values()) job.reject(err);
    pending.clear();
  };
  worker = w;
  return w;
};

const runCompile = (compilerUrl: string, input: StandardJsonInput): Promise<SolcOutput> => {
  const id = `solc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise<SolcOutput>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      getWorker().postMessage({ id, compilerUrl, input });
    } catch (err) {
      pending.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};

/**
 * Compile a Solidity contract using the real solc compiler loaded in a
 * Web Worker. If the source contains `@openzeppelin/...` imports, the
 * dependency graph is fetched from unpkg first and folded into the
 * standard-JSON input. Returns the contract's ABI + bytecode + metadata,
 * ready to deploy.
 */
export const compileSolidity = async (opts: CompileOptions): Promise<CompileResult> => {
  const contractName = opts.contractName?.trim();
  if (!contractName) throw new Error("Contract name is required to compile");
  if (!opts.sourceCode?.trim()) throw new Error("Source code is required to compile");

  const compilerVersion = opts.compilerVersion ?? DEFAULT_COMPILER_VERSION;
  const optimizationUsed = opts.optimizerEnabled ?? true;
  const optimizerRuns = opts.optimizerRuns ?? 200;
  const evmVersion = opts.evmVersion && opts.evmVersion !== "default" ? opts.evmVersion : undefined;
  const sourcePath = `contracts/${contractName}.sol`;

  let input: StandardJsonInput;
  if (hasExternalImports(opts.sourceCode)) {
    input = await buildStandardJsonInput({
      mainPath: sourcePath,
      mainSource: opts.sourceCode,
      optimizationUsed,
      optimizerRuns,
      evmVersion,
      ozVersion: opts.ozVersion ?? DEFAULT_OZ_VERSION,
      ozUpgradeableVersion: opts.ozUpgradeableVersion ?? DEFAULT_OZ_UPGRADEABLE_VERSION,
      onFetch: opts.onFetchImport,
    });
  } else {
    input = {
      language: "Solidity",
      sources: { [sourcePath]: { content: opts.sourceCode } },
      settings: {
        optimizer: { enabled: optimizationUsed, runs: optimizerRuns },
        evmVersion,
        metadata: { useLiteralContent: true },
        outputSelection: {
          "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] },
        },
      },
    };
  }

  const output = await runCompile(compilerUrlFor(compilerVersion), input);

  const fatal = (output.errors ?? []).filter((e) => e.severity === "error");
  if (fatal.length > 0) {
    throw new Error(
      fatal.map((e) => e.formattedMessage ?? e.message ?? "Unknown compile error").join("\n\n"),
    );
  }

  const fileContracts = output.contracts?.[sourcePath];
  if (!fileContracts) {
    throw new Error(
      `Compiler produced no output for ${sourcePath}. Check the contract name matches the source.`,
    );
  }
  const compiled = fileContracts[contractName];
  if (!compiled) {
    const available = Object.keys(fileContracts).join(", ") || "(none)";
    throw new Error(
      `Contract "${contractName}" not found in compilation output. Found: ${available}`,
    );
  }

  const bytecodeHex = compiled.evm?.bytecode?.object ?? "";
  if (!bytecodeHex || bytecodeHex.length === 0) {
    throw new Error(
      `Compiler returned empty bytecode for ${contractName}. The contract may be abstract or an interface.`,
    );
  }

  return {
    contractPath: `${sourcePath}:${contractName}`,
    sourcePath,
    abi: compiled.abi,
    bytecode: bytecodeHex.startsWith("0x") ? bytecodeHex : `0x${bytecodeHex}`,
    metadata: compiled.metadata,
    sources: input.sources,
  };
};
