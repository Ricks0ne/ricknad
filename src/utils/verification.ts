/**
 * Contract verification facade.
 *
 * The source of truth for whether a contract is "verified" is BaseScan —
 * a contract is only marked verified locally after the Etherscan V2
 * `checkverifystatus` endpoint returns "Pass - Verified" (or
 * `getsourcecode` returns a non-empty SourceCode for that address).
 *
 * Local state (localStorage) is a cache of the *last BaseScan-confirmed*
 * status, plus the last-used submission parameters — it never records
 * "success" without BaseScan confirmation.
 */

import { toast } from "sonner";
import {
  submitVerification as basescanSubmit,
  pollVerificationUntilComplete,
  checkAlreadyVerified,
  basescanCodeUrl,
  inferCompilerVersion,
  type PollResult,
  type SubmitVerificationInput,
  type VerificationResult,
} from "./basescanVerification";
import {
  buildStandardJsonInput,
  hasExternalImports,
  DEFAULT_OZ_VERSION,
} from "./solidityImports";

export type VerificationStatus = "unverified" | "pending" | "success" | "failure";

export interface StoredVerification {
  status: VerificationStatus;
  timestamp: number;
  /** Last BaseScan GUID we submitted — useful for "retry poll" flows. */
  guid?: string;
  /** Exact BaseScan `result` string, shown verbatim on the UI. */
  lastMessage?: string;
  /** Where the "Verified" confirmation came from. Currently only "basescan". */
  source?: "basescan";
}

const STORAGE_KEY = "ricknad_verified_contracts";

const readAll = (): Record<string, StoredVerification> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredVerification>) : {};
  } catch (error) {
    console.error("Failed to read verification cache:", error);
    return {};
  }
};

const writeEntry = (contractAddress: string, entry: StoredVerification) => {
  try {
    const all = readAll();
    all[contractAddress] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("Failed to save verification status:", error);
  }
};

export const saveVerificationStatus = (
  contractAddress: string,
  status: VerificationStatus,
  extra: Partial<Omit<StoredVerification, "status" | "timestamp">> = {},
): void => {
  writeEntry(contractAddress, {
    status,
    timestamp: Date.now(),
    ...extra,
  });
};

export const getVerificationStatus = (contractAddress: string): VerificationStatus => {
  return readAll()[contractAddress]?.status ?? "unverified";
};

export const getVerificationRecord = (
  contractAddress: string,
): StoredVerification | null => {
  return readAll()[contractAddress] ?? null;
};

export interface VerifyOptions {
  contractAddress: string;
  contractName: string;
  sourceCode: string;
  /** Etherscan full compiler string, e.g. `v0.8.20+commit.a1b79de6`. */
  compilerVersion?: string;
  optimizationUsed?: boolean;
  optimizerRuns?: number;
  evmVersion?: string;
  licenseType?: number;
  /** Hex string, with or without 0x prefix. */
  constructorArguments?: string;
  /**
   * OpenZeppelin `@openzeppelin/contracts` package version used when
   * compiling. Only relevant if the source imports `@openzeppelin/...`.
   * Defaults to `DEFAULT_OZ_VERSION`.
   */
  ozVersion?: string;
  /** OpenZeppelin upgradeable package version; defaults to `ozVersion`. */
  ozUpgradeableVersion?: string;
  /** Called with every poll update so UIs can render the live BaseScan message. */
  onPoll?: (result: PollResult) => void;
  /** Called each time an external import file is fetched, for progress UI. */
  onFetchImport?: (path: string) => void;
}

export interface VerifyOutcome {
  status: VerificationStatus;
  /** Exact string to display to the user — BaseScan's response verbatim. */
  message: string;
  guid?: string;
  explorerUrl: string;
}

/**
 * Submit → poll → resolve.
 *
 * UI should treat `status === "success"` as the ONLY signal to paint a
 * "Verified" badge. All other return states (including `pending`) mean the
 * badge must stay off.
 */
export const verifyContractOnBaseScan = async (
  opts: VerifyOptions,
): Promise<VerifyOutcome> => {
  const explorerUrl = basescanCodeUrl(opts.contractAddress);
  const optimizationUsed = opts.optimizationUsed ?? true;
  const optimizerRuns = opts.optimizerRuns ?? 200;
  const evmVersion = opts.evmVersion;

  const payload: SubmitVerificationInput = {
    contractAddress: opts.contractAddress,
    contractName: opts.contractName,
    sourceCode: opts.sourceCode,
    compilerVersion: opts.compilerVersion ?? inferCompilerVersion(opts.sourceCode),
    optimizationUsed,
    optimizerRuns,
    evmVersion,
    licenseType: opts.licenseType,
    constructorArguments: opts.constructorArguments,
  };

  // Detect bare-package imports (`@openzeppelin/...`). BaseScan can't
  // resolve those as single-file; fetch the dependency graph from unpkg
  // and submit as solidity-standard-json-input instead.
  if (hasExternalImports(opts.sourceCode)) {
    const mainPath = `contracts/${opts.contractName}.sol`;
    saveVerificationStatus(opts.contractAddress, "pending", {
      lastMessage: "Resolving imports…",
    });
    toast.info("Detected @-imports — fetching dependency graph…");
    try {
      const standardJson = await buildStandardJsonInput({
        mainPath,
        mainSource: opts.sourceCode,
        optimizationUsed,
        optimizerRuns,
        evmVersion,
        ozVersion: opts.ozVersion ?? DEFAULT_OZ_VERSION,
        ozUpgradeableVersion: opts.ozUpgradeableVersion,
        onFetch: opts.onFetchImport,
      });
      payload.sourceCode = JSON.stringify(standardJson);
      payload.codeFormat = "solidity-standard-json-input";
      payload.contractName = `${mainPath}:${opts.contractName}`;
    } catch (err) {
      const message =
        err instanceof Error
          ? `Failed to resolve imports: ${err.message}`
          : "Failed to resolve imports.";
      saveVerificationStatus(opts.contractAddress, "failure", { lastMessage: message });
      toast.error(message);
      return { status: "failure", message, explorerUrl };
    }
  }

  saveVerificationStatus(opts.contractAddress, "pending");
  toast.info("Submitting source to BaseScan…");

  const submission: VerificationResult = await basescanSubmit(payload);

  switch (submission.kind) {
    case "already_verified": {
      const message = "Contract is already verified on BaseScan.";
      saveVerificationStatus(opts.contractAddress, "success", {
        lastMessage: message,
        source: "basescan",
      });
      toast.success(message);
      return { status: "success", message, explorerUrl };
    }
    case "missing_api_key": {
      const message =
        "Missing VITE_BASESCAN_API_KEY. Add a BaseScan API key to your environment and retry.";
      saveVerificationStatus(opts.contractAddress, "failure", { lastMessage: message });
      toast.error(message);
      return { status: "failure", message, explorerUrl };
    }
    case "plan_not_supported":
    case "rate_limited":
    case "error": {
      const message = submission.message;
      saveVerificationStatus(opts.contractAddress, "failure", { lastMessage: message });
      toast.error(`BaseScan: ${message}`);
      return { status: "failure", message, explorerUrl };
    }
    case "submitted":
      break;
  }

  const guid = submission.guid;
  saveVerificationStatus(opts.contractAddress, "pending", { guid });
  toast.info(`BaseScan accepted submission (GUID ${guid}). Polling…`);

  const final = await pollVerificationUntilComplete(guid, {
    onPoll: opts.onPoll,
  });

  switch (final.kind) {
    case "success": {
      saveVerificationStatus(opts.contractAddress, "success", {
        guid,
        lastMessage: final.message,
        source: "basescan",
      });
      toast.success("Contract verified on BaseScan.", { description: final.message });
      return { status: "success", message: final.message, guid, explorerUrl };
    }
    case "failure": {
      saveVerificationStatus(opts.contractAddress, "failure", {
        guid,
        lastMessage: final.reason,
      });
      toast.error("BaseScan verification failed.", { description: final.reason });
      return { status: "failure", message: final.reason, guid, explorerUrl };
    }
    case "pending":
    case "error": {
      const message = "message" in final ? final.message : "Pending";
      saveVerificationStatus(opts.contractAddress, final.kind === "pending" ? "pending" : "failure", {
        guid,
        lastMessage: message,
      });
      toast.error("BaseScan verification did not complete.", { description: message });
      return {
        status: final.kind === "pending" ? "pending" : "failure",
        message,
        guid,
        explorerUrl,
      };
    }
  }
};

/**
 * Re-query BaseScan for the authoritative status of a contract. Useful for
 * reconciling local cache on page load ("the user submitted last session —
 * has BaseScan finished processing?").
 */
export const refreshVerificationStatus = async (
  contractAddress: string,
): Promise<VerifyOutcome> => {
  const explorerUrl = basescanCodeUrl(contractAddress);
  toast.info("Checking BaseScan for current verification status…");

  const peek = await checkAlreadyVerified(contractAddress);
  if (peek.verified) {
    const message = "Contract is verified on BaseScan.";
    saveVerificationStatus(contractAddress, "success", {
      lastMessage: message,
      source: "basescan",
    });
    toast.success(message);
    return { status: "success", message, explorerUrl };
  }

  const existing = getVerificationRecord(contractAddress);
  if (existing?.guid) {
    const polled = await pollVerificationUntilComplete(existing.guid, {
      timeoutMs: 15_000,
      intervalMs: 3_000,
    });
    if (polled.kind === "success") {
      saveVerificationStatus(contractAddress, "success", {
        guid: existing.guid,
        lastMessage: polled.message,
        source: "basescan",
      });
      toast.success("Contract verified on BaseScan.", { description: polled.message });
      return { status: "success", message: polled.message, guid: existing.guid, explorerUrl };
    }
    if (polled.kind === "failure") {
      saveVerificationStatus(contractAddress, "failure", {
        guid: existing.guid,
        lastMessage: polled.reason,
      });
      return {
        status: "failure",
        message: polled.reason,
        guid: existing.guid,
        explorerUrl,
      };
    }
    const msg = polled.kind === "pending" ? polled.message : polled.message;
    return {
      status: polled.kind === "pending" ? "pending" : "failure",
      message: msg,
      guid: existing.guid,
      explorerUrl,
    };
  }

  const message = peek.error ?? "Contract is not verified on BaseScan yet.";
  saveVerificationStatus(contractAddress, "unverified", { lastMessage: message });
  return { status: "unverified", message, explorerUrl };
};
