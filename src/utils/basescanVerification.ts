/**
 * BaseScan (Etherscan V2) contract verification client.
 *
 * Submits source code to the `verifysourcecode` endpoint, polls
 * `checkverifystatus` until Etherscan returns a terminal result, and lets
 * callers peek at whether a contract is already verified via `getsourcecode`.
 *
 * Etherscan's V1 per-chain endpoints (including api.basescan.org/api) are
 * deprecated — the V2 multichain endpoint at
 *   https://api.etherscan.io/v2/api?chainid=8453
 * is the canonical path for Base Mainnet.
 *
 * Error handling: the `plan_not_supported` / `rate_limited` branches only
 * fire when Etherscan returns one of those messages verbatim. Any other
 * non-OK response is surfaced to the UI as-is (including the common
 * `Unable to locate ContractCode at …` / `Fail - Unable to verify` /
 * compiler-mismatch reasons) so the user sees BaseScan's exact feedback.
 */

import { BASE_MAINNET } from "@/config/base";

const ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api";
const CHAIN_ID = BASE_MAINNET.chainId;

export type VerificationResult =
  | { kind: "already_verified"; source?: string }
  | { kind: "submitted"; guid: string }
  | { kind: "missing_api_key" }
  | { kind: "plan_not_supported"; message: string }
  | { kind: "rate_limited"; message: string }
  | { kind: "error"; message: string };

export type PollResult =
  | { kind: "pending"; message: string }
  | { kind: "success"; message: string }
  | { kind: "failure"; reason: string }
  | { kind: "error"; message: string };

export interface SubmitVerificationInput {
  contractAddress: string;
  contractName: string;
  sourceCode: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  optimizerRuns: number;
  evmVersion?: string;
  licenseType?: number;
  constructorArguments?: string;
  /**
   * Submission format. Defaults to `solidity-single-file`. Use
   * `solidity-standard-json-input` when `sourceCode` is a JSON string
   * produced by `buildStandardJsonInput` — required for contracts that
   * `import "@openzeppelin/..."` or any other bare-package path.
   *
   * When `solidity-standard-json-input` is used, `contractName` MUST be
   * fully-qualified as `path/to/Main.sol:ContractName` so Etherscan
   * can select the right contract out of the sources map.
   */
  codeFormat?: "solidity-single-file" | "solidity-standard-json-input";
}

const getApiKey = (): string | null => {
  const key = import.meta.env.VITE_BASESCAN_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
};

const normalizeConstructorArgs = (raw?: string): string => {
  if (!raw) return "";
  const trimmed = raw.trim();
  return trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
};

const parseEtherscanError = (message: string): VerificationResult | null => {
  const lower = message.toLowerCase();
  if (lower.includes("api plan") || lower.includes("not supported for this chain")) {
    return {
      kind: "plan_not_supported",
      message:
        "Your BaseScan/Etherscan API key plan does not support contract verification on Base Mainnet. Upgrade the key (or create a Base-specific key) and retry.",
    };
  }
  if (lower.includes("rate limit") || lower.includes("max rate")) {
    return { kind: "rate_limited", message };
  }
  return null;
};

/**
 * Submit source code to BaseScan. Returns a discriminated union so the UI
 * can differentiate "already verified", "submitted, here's the GUID",
 * missing API key, plan-not-supported, and generic failures.
 */
export const submitVerification = async (
  input: SubmitVerificationInput,
): Promise<VerificationResult> => {
  const apiKey = getApiKey();
  if (!apiKey) return { kind: "missing_api_key" };

  const alreadyVerified = await checkAlreadyVerified(input.contractAddress);
  if (alreadyVerified.verified) {
    return { kind: "already_verified", source: alreadyVerified.source };
  }

  // Etherscan V2 requires `chainid` in the URL query string, NOT the POST body.
  // Empirically: POSTing with `chainid` only in the body returns
  // `Missing or unsupported chainid parameter (required for v2 api)`.
  const endpoint = `${ETHERSCAN_V2_URL}?chainid=${encodeURIComponent(CHAIN_ID)}`;

  const codeFormat = input.codeFormat ?? "solidity-single-file";
  const body = new URLSearchParams();
  body.set("apikey", apiKey);
  body.set("module", "contract");
  body.set("action", "verifysourcecode");
  body.set("codeformat", codeFormat);
  body.set("contractaddress", input.contractAddress);
  body.set("sourceCode", input.sourceCode);
  body.set("contractname", input.contractName);
  body.set("compilerversion", input.compilerVersion);
  body.set("optimizationUsed", input.optimizationUsed ? "1" : "0");
  body.set("runs", String(input.optimizerRuns));
  if (input.evmVersion) body.set("evmversion", input.evmVersion);
  if (typeof input.licenseType === "number") body.set("licenseType", String(input.licenseType));
  body.set("constructorArguements", normalizeConstructorArgs(input.constructorArguments));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await response.json()) as {
      status: string;
      message: string;
      result: string;
    };

    if (data.status === "1") {
      return { kind: "submitted", guid: data.result };
    }

    const planError = parseEtherscanError(data.result || data.message || "");
    if (planError) return planError;

    return {
      kind: "error",
      message: data.result || data.message || "BaseScan rejected the verification request.",
    };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error contacting BaseScan.",
    };
  }
};

/**
 * Poll `checkverifystatus` for the GUID returned by submitVerification.
 * A single call only — callers decide how/when to retry.
 */
export const checkVerificationStatus = async (guid: string): Promise<PollResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { kind: "error", message: "Missing VITE_BASESCAN_API_KEY." };
  }

  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", CHAIN_ID);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "checkverifystatus");
  url.searchParams.set("guid", guid);

  try {
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      status: string;
      message: string;
      result: string;
    };

    const result = (data.result || "").trim();
    if (data.status === "1" || /^pass/i.test(result)) {
      return { kind: "success", message: result || "Pass - Verified" };
    }
    if (/^pending/i.test(result) || /^in\s*progress/i.test(result)) {
      return { kind: "pending", message: result || "Pending in queue" };
    }
    if (/^fail/i.test(result) || /unable\s+to\s+verify/i.test(result)) {
      return { kind: "failure", reason: result };
    }
    if (data.status === "0" && data.message) {
      return { kind: "error", message: `${data.message}${result ? `: ${result}` : ""}` };
    }
    return { kind: "error", message: result || "Unexpected BaseScan response." };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error contacting BaseScan.",
    };
  }
};

/**
 * Poll until BaseScan returns a terminal status or we hit the timeout.
 * Emits progress via the optional onPoll callback so the UI can show the
 * intermediate "Pending in queue" / "In progress" messages.
 */
export const pollVerificationUntilComplete = async (
  guid: string,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    onPoll?: (result: PollResult) => void;
  } = {},
): Promise<PollResult> => {
  const intervalMs = opts.intervalMs ?? 5000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const start = Date.now();

  while (true) {
    const result = await checkVerificationStatus(guid);
    opts.onPoll?.(result);
    if (result.kind !== "pending") return result;
    if (Date.now() - start > timeoutMs) {
      return {
        kind: "error",
        message: `Verification still pending after ${Math.round(timeoutMs / 1000)}s — check BaseScan manually.`,
      };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

/**
 * Peek at whether a contract is already verified on BaseScan.
 * Uses `getsourcecode` which returns a non-empty `SourceCode` string when verified.
 */
export const checkAlreadyVerified = async (
  contractAddress: string,
): Promise<{ verified: boolean; source?: string; error?: string }> => {
  const apiKey = getApiKey();

  const url = new URL(ETHERSCAN_V2_URL);
  url.searchParams.set("chainid", CHAIN_ID);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  if (apiKey) url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      status: string;
      message: string;
      result?: Array<{ SourceCode?: string; ABI?: string }>;
    };
    const first = Array.isArray(data.result) ? data.result[0] : undefined;
    const source = first?.SourceCode?.trim() ?? "";
    if (source.length > 0 && first?.ABI !== "Contract source code not verified") {
      return { verified: true, source };
    }
    return { verified: false };
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : "Network error contacting BaseScan.",
    };
  }
};

/**
 * BaseScan-facing URL for a contract's code tab.
 */
export const basescanCodeUrl = (contractAddress: string): string =>
  `${BASE_MAINNET.blockExplorerUrl}/address/${contractAddress}#code`;

/**
 * Common full-build solc versions accepted by Etherscan's verifier.
 * Keep in sync with enhancedContractGenerator.ts default pragmas.
 */
export const SOLC_VERSIONS: Array<{ label: string; value: string }> = [
  { label: "0.8.28", value: "v0.8.28+commit.7893614a" },
  { label: "0.8.27", value: "v0.8.27+commit.40a35a09" },
  { label: "0.8.26", value: "v0.8.26+commit.8a97fa7a" },
  { label: "0.8.24", value: "v0.8.24+commit.e11b9ed9" },
  { label: "0.8.23", value: "v0.8.23+commit.f704f362" },
  { label: "0.8.22", value: "v0.8.22+commit.4fc1097e" },
  { label: "0.8.21", value: "v0.8.21+commit.d9974bed" },
  { label: "0.8.20", value: "v0.8.20+commit.a1b79de6" },
  { label: "0.8.19", value: "v0.8.19+commit.7dd6d404" },
  { label: "0.8.18", value: "v0.8.18+commit.87f61d96" },
  { label: "0.8.17", value: "v0.8.17+commit.8df45f5f" },
];

export const DEFAULT_SOLC_VERSION = SOLC_VERSIONS[7].value; // 0.8.20

/**
 * Infer a reasonable Etherscan `compilerversion` string from a Solidity
 * source file's `pragma solidity` directive. Falls back to DEFAULT_SOLC_VERSION.
 */
export const inferCompilerVersion = (sourceCode: string): string => {
  const match = sourceCode.match(/pragma\s+solidity\s+\^?([0-9]+\.[0-9]+\.[0-9]+)/);
  if (!match) return DEFAULT_SOLC_VERSION;
  const version = match[1];
  const exact = SOLC_VERSIONS.find((v) => v.label === version);
  return exact?.value ?? DEFAULT_SOLC_VERSION;
};
