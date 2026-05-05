/**
 * Centralized environment variable access.
 *
 * Secrets are configured ONLY in Vercel (Project Settings → Environment
 * Variables). The repo never contains real values — `.env.example` lists
 * the names with placeholder values for local dev only.
 *
 * All variables here are `VITE_*` and are inlined into the public bundle
 * at build time, so only public-safe values belong in here.
 */

export const BASESCAN_API_KEY: string = import.meta.env.VITE_BASESCAN_API_KEY ?? "";

/**
 * Base "Builder Code" — an opaque identifier issued by Base to attribute
 * transactions to this app. Appended to every transaction's calldata as a
 * `dataSuffix` so Base can credit the originating builder.
 */
export const BASE_BUILDER_CODE: string = import.meta.env.VITE_BASE_BUILDER_CODE ?? "";

/**
 * Raw hex suffix appended to every transaction's `data` field. May be
 * provided directly via `VITE_BASE_DATA_SUFFIX`, or derived from
 * `VITE_BASE_BUILDER_CODE` when only the builder code is set.
 */
export const BASE_DATA_SUFFIX: string = (() => {
  const explicit = import.meta.env.VITE_BASE_DATA_SUFFIX;
  if (explicit) return explicit;
  if (BASE_BUILDER_CODE) {
    return BASE_BUILDER_CODE.startsWith("0x") ? BASE_BUILDER_CODE : `0x${BASE_BUILDER_CODE}`;
  }
  return "";
})();

export interface EnvStatus {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate required env vars. Returns the list of missing variables so the
 * UI can surface a clear error and disable destructive actions (deploy,
 * contract interaction, wallet analytics).
 *
 * `VITE_BASE_DATA_SUFFIX` is satisfied by `VITE_BASE_BUILDER_CODE`.
 */
export const getEnvStatus = (): EnvStatus => {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!BASESCAN_API_KEY) missing.push("VITE_BASESCAN_API_KEY");
  if (!BASE_BUILDER_CODE && !import.meta.env.VITE_BASE_DATA_SUFFIX) {
    missing.push("VITE_BASE_BUILDER_CODE");
  }
  if (BASE_DATA_SUFFIX && !/^0x[0-9a-fA-F]*$/.test(BASE_DATA_SUFFIX)) {
    warnings.push("VITE_BASE_DATA_SUFFIX is not a valid hex string and will be ignored.");
  }
  return { ok: missing.length === 0, missing, warnings };
};

export const isEnvConfigured = (): boolean => getEnvStatus().ok;

/**
 * Strip leading 0x from a hex suffix so it can be concatenated to existing
 * calldata. Returns "" when no suffix is configured or the value is invalid.
 */
export const getDataSuffixHex = (): string => {
  if (!BASE_DATA_SUFFIX) return "";
  if (!/^0x[0-9a-fA-F]*$/.test(BASE_DATA_SUFFIX)) return "";
  return BASE_DATA_SUFFIX.slice(2);
};

/**
 * Append the configured builder-code suffix to a transaction's `data`
 * field. Safe to call with `undefined` data (treated as "0x") and a no-op
 * when no suffix is configured.
 */
export const appendDataSuffix = (data?: string | null): string => {
  const base = data && data !== "0x" ? (data.startsWith("0x") ? data : `0x${data}`) : "0x";
  const suffix = getDataSuffixHex();
  if (!suffix) return base;
  return `${base}${suffix}`;
};
