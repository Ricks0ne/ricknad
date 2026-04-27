
import { ethers } from "ethers";
import { BASE_TESTNET } from "../config/base";
import { Transaction } from "../types/blockchain";
import { runThrottled } from "./rateLimitedFetch";

// BaseScan is now served via the Etherscan V2 multichain endpoint.
// https://docs.etherscan.io/etherscan-v2/getting-started/v2-quickstart
const ETHERSCAN_V2_API_URL = "https://api.etherscan.io/v2/api";
const BASE_CHAIN_ID = "8453";
// Blockscout exposes an Etherscan-compatible API with no key required;
// used as an automatic fallback when the user's Etherscan V2 key does
// not cover Base Mainnet (free tier) or we get rate-limited.
const BLOCKSCOUT_API_URL = "https://base.blockscout.com/api";
const BASESCAN_API_URL = ETHERSCAN_V2_API_URL; // legacy alias for existing callers

export interface BaseNetworkMetrics {
  blockNumber: number;
  gasPriceWei: bigint;
  gasPriceGwei: string;
  baseFeeGwei: string;
  priorityFeeGwei: string;
  blockTimestamp: number;
  txCount: number;
  pendingTxCount: number;
  syncing: boolean;
  connected: boolean;
}

export interface DeploymentCostEstimate {
  chainId: bigint;
  balance: bigint;
  estimatedGas: bigint;
  gasPrice: bigint;
  totalCost: bigint;
  balanceEth: string;
  estimatedCostEth: string;
  gasPriceGwei: string;
}

// Initialize a provider for Base Mainnet
export const getProvider = () => {
  try {
    return new ethers.JsonRpcProvider(BASE_TESTNET.rpcUrl);
  } catch (error) {
    console.error("Failed to initialize provider:", error);
    throw error;
  }
};

export const getRealtimeProvider = () => {
  try {
    return new ethers.JsonRpcProvider(BASE_TESTNET.realtimeRpcUrl || BASE_TESTNET.rpcUrl);
  } catch (error) {
    console.error("Failed to initialize realtime provider:", error);
    throw error;
  }
};

export const isValidWalletAddress = (address: string) => ethers.isAddress(address);

export const assertBaseMainnet = async (provider = getProvider()) => {
  const network = await provider.getNetwork();
  console.log("Base RPC chainId:", network.chainId.toString());
  if (network.chainId !== BigInt(BASE_TESTNET.chainId)) {
    throw new Error(`RPC is not connected to Base Mainnet. Expected chainId ${BASE_TESTNET.chainId}, got ${network.chainId.toString()}.`);
  }
  return network;
};

export const fetchBaseNetworkMetrics = async (): Promise<BaseNetworkMetrics> => {
  const provider = getProvider();
  const realtimeProvider = getRealtimeProvider();
  await assertBaseMainnet(provider);

  const [latestBlock, pendingBlock, gasPriceHex, feeHistory, syncing] = await Promise.all([
    provider.send("eth_getBlockByNumber", ["latest", true]),
    realtimeProvider.send("eth_getBlockByNumber", ["pending", true]).catch(() => null),
    provider.send("eth_gasPrice", []),
    provider.send("eth_feeHistory", ["0x5", "latest", [50]]).catch(() => null),
    provider.send("eth_syncing", []).catch(() => false),
  ]);

  if (!latestBlock) throw new Error("Unable to fetch latest Base block from RPC.");

  const blockNumber = Number(BigInt(latestBlock.number));
  const gasPriceWei = BigInt(gasPriceHex);
  const baseFeeWei = latestBlock.baseFeePerGas ? BigInt(latestBlock.baseFeePerGas) : 0n;
  const rewardSamples = feeHistory?.reward?.flat?.() || [];
  const priorityFeeWei = rewardSamples.length ? BigInt(rewardSamples[rewardSamples.length - 1]) : gasPriceWei > baseFeeWei ? gasPriceWei - baseFeeWei : 0n;

  return {
    blockNumber,
    gasPriceWei,
    gasPriceGwei: Number(ethers.formatUnits(gasPriceWei, "gwei")).toFixed(4),
    baseFeeGwei: Number(ethers.formatUnits(baseFeeWei, "gwei")).toFixed(4),
    priorityFeeGwei: Number(ethers.formatUnits(priorityFeeWei, "gwei")).toFixed(4),
    blockTimestamp: Number(BigInt(latestBlock.timestamp)) * 1000,
    txCount: latestBlock.transactions?.length || 0,
    pendingTxCount: pendingBlock?.transactions?.length || 0,
    syncing: syncing !== false,
    connected: true,
  };
};

// Get wallet balance
export const getWalletBalance = async (address: string) => {
  try {
    if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");
    const provider = getProvider();
    await assertBaseMainnet(provider);
    const balance = await provider.getBalance(address);
    console.log("Base wallet balance:", ethers.formatEther(balance));
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get wallet balance:", error);
    throw error;
  }
};

const mapIndexerTransaction = (tx: any): Transaction => ({
  hash: tx.hash,
  from: tx.from,
  to: tx.to || "",
  value: ethers.formatEther(BigInt(tx.value || "0")),
  gasUsed: tx.gasUsed || tx.gas_used || "0",
  timestamp: tx.timeStamp
    ? Number(tx.timeStamp) * 1000
    : tx.timestamp
      ? Date.parse(tx.timestamp)
      : 0,
  status: tx.isError === "1" || tx.status === "0" ? "failed" : "success",
});

export class RateLimitError extends Error {
  constructor(message = "BaseScan API rate limit reached. Please wait a moment and retry.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export interface WalletAnalytics {
  address: string;
  balanceEth: string;
  totalTransactions: number;
  normalTxCount: number;
  internalTxCount: number;
  tokenTxCount: number;
  uniqueContractsInteracted: number;
  firstActivityTimestamp: number | null;
  lastActivityTimestamp: number | null;
  walletAgeMs: number | null;
  transactions: Transaction[];
  source: "etherscan-v2" | "blockscout";
}

const BASESCAN_MAX_OFFSET = 10000;

// `txlist`, `txlistinternal`, and `tokentx` return slightly different row
// shapes. `RawBaseScanTx` is the superset: every field is optional except
// the block marker we need for pagination and the timestamp we need for
// first/last activity.
interface RawBaseScanTx {
  hash?: string;
  transactionHash?: string; // internal txs use this instead of `hash`
  from: string;
  to?: string;
  value?: string;
  gasUsed?: string;
  timeStamp: string;
  blockNumber?: string;
  isError?: string;
  txreceipt_status?: string;
  contractAddress?: string;
  functionName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  input?: string;
}

export type AccountAction = "txlist" | "txlistinternal" | "tokentx";

const buildEtherscanV2AccountUrl = (
  address: string,
  action: AccountAction,
  params: Record<string, string>,
): string => {
  const key = import.meta.env.VITE_BASESCAN_API_KEY;
  const search = new URLSearchParams({
    chainid: BASE_CHAIN_ID,
    module: "account",
    action,
    address,
    startblock: "0",
    endblock: "99999999",
    ...params,
  });
  if (key) search.set("apikey", key);
  return `${ETHERSCAN_V2_API_URL}?${search.toString()}`;
};

const buildBlockscoutAccountUrl = (
  address: string,
  action: AccountAction,
  params: Record<string, string>,
): string => {
  const search = new URLSearchParams({
    module: "account",
    action,
    address,
    startblock: "0",
    endblock: "99999999",
    ...params,
  });
  return `${BLOCKSCOUT_API_URL}?${search.toString()}`;
};

const isRateLimitMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("max rate") ||
    lower.includes("too many requests")
  );
};

const isPlanLimitMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  // Returned when the Etherscan V2 key's plan doesn't cover the requested chain
  // (the default for free-tier keys on Base Mainnet).
  return lower.includes("free api access is not supported") || lower.includes("upgrade your api plan");
};

const isDeprecatedEndpointMessage = (message: string): boolean => {
  return message.toLowerCase().includes("deprecated v1 endpoint");
};

export class PlanNotCoveredError extends Error {
  constructor(message = "Your Etherscan/BaseScan API key plan does not cover Base Mainnet (chainid 8453). Falling back to Blockscout.") {
    super(message);
    this.name = "PlanNotCoveredError";
  }
}

interface BaseScanEnvelope {
  status?: string;
  message?: unknown;
  result?: unknown;
}

const classifyBaseScanError = (
  data: BaseScanEnvelope,
): "empty" | "rate-limit" | "plan-limit" | "ok" | { error: string } => {
  if (data.status === "0") {
    const msg: string = typeof data.message === "string" ? data.message : "";
    const resultMsg: string = typeof data.result === "string" ? data.result : "";
    const combined = `${msg} ${resultMsg}`.trim();
    if (msg.toLowerCase().includes("no transactions found")) return "empty";
    if (isRateLimitMessage(combined)) return "rate-limit";
    if (isPlanLimitMessage(combined) || isDeprecatedEndpointMessage(combined)) return "plan-limit";
    return { error: resultMsg || msg || "Transaction indexer request failed." };
  }
  return "ok";
};

// Fetch a single page of BaseScan-compatible account rows, throttled through
// the shared rate-limit queue. Returns "empty" sentinel when the provider
// reports "no transactions found" so callers can terminate pagination cleanly.
const fetchAccountPage = async (url: string): Promise<RawBaseScanTx[] | "empty"> =>
  runThrottled(
    async () => {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Transaction indexer responded with ${response.status}: ${response.statusText}`);
      }
      const cls = classifyBaseScanError(data);
      if (cls === "empty") return "empty" as const;
      if (cls === "rate-limit") throw new RateLimitError();
      if (cls === "plan-limit") {
        const resultMsg = typeof data.result === "string" ? data.result : "";
        const msg = typeof data.message === "string" ? data.message : "";
        throw new PlanNotCoveredError(resultMsg || msg);
      }
      if (typeof cls === "object") throw new Error(cls.error);
      return Array.isArray(data.result) ? (data.result as RawBaseScanTx[]) : [];
    },
    (err) => err instanceof RateLimitError,
  );

export interface TxListFetchMeta {
  source: "etherscan-v2" | "blockscout";
  fallbackReason?: string;
}

export interface TxListFetchResult {
  transactions: RawBaseScanTx[];
  meta: TxListFetchMeta;
}

// Per-action pagination caps. Normal and internal txs paginate quickly on
// Blockscout (seconds per 10k chunk); token transfers are drastically slower
// (tens of seconds per chunk) because Blockscout joins against every token
// transfer event. We therefore cap token transfers at a single chunk while
// still allowing deeper pagination for the cheaper endpoints.
const MAX_CHUNKS_DEFAULT = 3;
const MAX_CHUNKS_PER_ACTION: Record<AccountAction, number> = {
  txlist: 3,
  txlistinternal: 3,
  tokentx: 1,
};

// Block-based continuation pagination shared by every action. Etherscan V2
// and Blockscout both cap `page * offset <= 10000`, so naive page-based
// pagination fails on page 2. Instead, after a full 10k-result chunk we
// advance `startblock` past the last returned block and request again.
const runPaginated = async (
  buildUrl: (params: Record<string, string>) => string,
  maxChunks: number = MAX_CHUNKS_DEFAULT,
): Promise<RawBaseScanTx[]> => {
  const all: RawBaseScanTx[] = [];
  let startblock = "0";
  for (let chunk = 0; chunk < maxChunks; chunk += 1) {
    const url = buildUrl({
      sort: "asc",
      page: "1",
      offset: String(BASESCAN_MAX_OFFSET),
      startblock,
    });
    const batch = await fetchAccountPage(url);
    if (batch === "empty") break;
    all.push(...batch);
    if (batch.length < BASESCAN_MAX_OFFSET) break;
    const lastBlock = batch[batch.length - 1]?.blockNumber;
    const lastBlockNum = lastBlock ? Number(lastBlock) : NaN;
    if (!Number.isFinite(lastBlockNum)) break;
    // Advance past the last-seen block. This may miss siblings in the
    // same block (rare for a single EOA) but guarantees forward progress
    // within the API's page*offset <= 10000 limit.
    startblock = String(lastBlockNum + 1);
  }
  return all;
};

// Fetch a full account dataset for one action, trying Etherscan V2 first and
// automatically falling back to Blockscout on plan-limit or deprecated-v1
// errors. Returned rows are sorted ASC by block number.
const fetchAccountDataset = async (
  address: string,
  action: AccountAction,
): Promise<TxListFetchResult> => {
  const maxChunks = MAX_CHUNKS_PER_ACTION[action] ?? MAX_CHUNKS_DEFAULT;
  try {
    const transactions = await runPaginated(
      (params) => buildEtherscanV2AccountUrl(address, action, params),
      maxChunks,
    );
    return { transactions, meta: { source: "etherscan-v2" } };
  } catch (err) {
    if (err instanceof PlanNotCoveredError) {
      console.warn(
        `Etherscan V2 refused Base Mainnet for ${action} on this key. Falling back to Blockscout.`,
      );
      const transactions = await runPaginated(
        (params) => buildBlockscoutAccountUrl(address, action, params),
        maxChunks,
      );
      return {
        transactions,
        meta: { source: "blockscout", fallbackReason: err.message },
      };
    }
    throw err;
  }
};

// Legacy alias — single `txlist` fetch, kept for callers that only want
// normal transactions (e.g. the simpler HomePage balance widget).
export const fetchBaseScanTxList = (address: string): Promise<TxListFetchResult> => {
  if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");
  return fetchAccountDataset(address, "txlist");
};

// Pull the complete activity surface for a wallet: normal txs, internal txs,
// and ERC20 transfers. Runs the three fetches concurrently so they share the
// shared rate-limit queue rather than running serially.
export interface AllWalletActivity {
  normal: RawBaseScanTx[];
  internal: RawBaseScanTx[];
  token: RawBaseScanTx[];
  source: "etherscan-v2" | "blockscout";
}

export const fetchAllWalletActivity = async (
  address: string,
): Promise<AllWalletActivity> => {
  if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");

  const [normal, internal, token] = await Promise.all([
    fetchAccountDataset(address, "txlist"),
    fetchAccountDataset(address, "txlistinternal"),
    fetchAccountDataset(address, "tokentx"),
  ]);

  // If any individual dataset fell back to Blockscout, report the merged
  // source as Blockscout so the UI's source label stays accurate.
  const source: "etherscan-v2" | "blockscout" =
    normal.meta.source === "blockscout" ||
    internal.meta.source === "blockscout" ||
    token.meta.source === "blockscout"
      ? "blockscout"
      : "etherscan-v2";

  return {
    normal: normal.transactions,
    internal: internal.transactions,
    token: token.transactions,
    source,
  };
};

const mapBaseScanTx = (tx: RawBaseScanTx): Transaction => ({
  hash: tx.hash || tx.transactionHash || "",
  from: tx.from,
  to: tx.to || tx.contractAddress || "",
  value: ethers.formatEther(BigInt(tx.value || "0")),
  gasUsed: tx.gasUsed || "0",
  timestamp: tx.timeStamp ? Number(tx.timeStamp) * 1000 : 0,
  status:
    tx.isError === "1" || tx.txreceipt_status === "0"
      ? "failed"
      : "success",
});

// Batched `eth_getCode` check: returns the subset of `candidates` whose
// on-chain bytecode is non-empty (i.e. actual smart contracts). Skips the
// zero address and the wallet itself. Runs with a small concurrency cap so
// we don't flood the RPC provider.
const CONTRACT_CHECK_CONCURRENCY = 6;

const filterRealContracts = async (
  ownerAddress: string,
  candidates: string[],
): Promise<Set<string>> => {
  const unique = Array.from(
    new Set(
      candidates
        .map((a) => (a || "").toLowerCase())
        .filter((a) => a && a !== ethers.ZeroAddress.toLowerCase() && a !== ownerAddress.toLowerCase()),
    ),
  );
  if (unique.length === 0) return new Set<string>();

  const provider = getProvider();
  const contracts = new Set<string>();

  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONTRACT_CHECK_CONCURRENCY, unique.length) }, async () => {
    while (cursor < unique.length) {
      const index = cursor;
      cursor += 1;
      const addr = unique[index];
      try {
        const code = await provider.getCode(addr);
        if (code && code !== "0x") contracts.add(addr);
      } catch (err) {
        // Treat RPC failures as "unknown" — do not count as contract.
        console.warn(`eth_getCode failed for ${addr}:`, err);
      }
    }
  });
  await Promise.all(workers);
  return contracts;
};

// Merge the three raw datasets into a single unified view, deduped by tx
// hash (internal + token txs share their parent tx's hash with `txlist`
// when applicable). Earliest/latest timestamps are picked across the full
// merged set, which is how BaseScan itself reports wallet age.
interface MergedActivity {
  totalRecords: number;
  earliestTs: number | null;
  latestTs: number | null;
  transactions: Transaction[];
  candidateCounterparties: string[];
}

const mergeActivity = (activity: AllWalletActivity): MergedActivity => {
  const all: RawBaseScanTx[] = [...activity.normal, ...activity.internal, ...activity.token];
  if (all.length === 0) {
    return {
      totalRecords: 0,
      earliestTs: null,
      latestTs: null,
      transactions: [],
      candidateCounterparties: [],
    };
  }

  let earliest = Number.POSITIVE_INFINITY;
  let latest = 0;
  const candidates: string[] = [];
  for (const tx of all) {
    const ts = Number(tx.timeStamp);
    if (Number.isFinite(ts)) {
      if (ts < earliest) earliest = ts;
      if (ts > latest) latest = ts;
    }
    const target = tx.to || tx.contractAddress;
    if (target) candidates.push(target);
  }

  // Build the UI tx list from the `txlist` + `txlistinternal` records only
  // (token transfers are better viewed on BaseScan's dedicated tab and use
  // token amounts, not ETH, which would confuse the "Value (ETH)" column).
  const uiRecords = [...activity.normal, ...activity.internal];
  // Dedupe by hash so a normal tx and its internal companion appear once.
  const seen = new Set<string>();
  const transactions: Transaction[] = [];
  for (const raw of uiRecords) {
    const hash = raw.hash || raw.transactionHash || "";
    if (!hash || seen.has(hash)) continue;
    seen.add(hash);
    transactions.push(mapBaseScanTx(raw));
  }

  return {
    totalRecords: all.length,
    earliestTs: Number.isFinite(earliest) ? earliest * 1000 : null,
    latestTs: latest ? latest * 1000 : null,
    transactions,
    candidateCounterparties: candidates,
  };
};

// Short-lived in-memory cache so that the 15s auto-refresh, tab switches,
// and rapid re-scans don't hammer the API. Keyed by lowercase address.
interface CachedAnalytics {
  expiresAt: number;
  value: WalletAnalytics;
}
const analyticsCache = new Map<string, CachedAnalytics>();
const ANALYTICS_TTL_MS = 12_000;

export const clearWalletAnalyticsCache = (address?: string) => {
  if (!address) analyticsCache.clear();
  else analyticsCache.delete(address.toLowerCase());
};

const buildAnalytics = (
  address: string,
  balanceEth: string,
  activity: AllWalletActivity,
  realContracts: Set<string>,
): WalletAnalytics => {
  const merged = mergeActivity(activity);
  return {
    address,
    balanceEth,
    totalTransactions: merged.totalRecords,
    normalTxCount: activity.normal.length,
    internalTxCount: activity.internal.length,
    tokenTxCount: activity.token.length,
    uniqueContractsInteracted: realContracts.size,
    firstActivityTimestamp: merged.earliestTs,
    lastActivityTimestamp: merged.latestTs,
    walletAgeMs: merged.earliestTs ? Date.now() - merged.earliestTs : null,
    transactions: merged.transactions,
    source: activity.source,
  };
};

// Full wallet analytics. Pulls normal + internal + token transfer history,
// each paginated block-by-block, unions them, then runs a concurrency-capped
// `eth_getCode` pass to keep only true contract counterparties.
//
// Progressive rendering: `txlist` + `txlistinternal` are fast enough to
// resolve in seconds, while `tokentx` can take close to a minute for very
// active wallets. We therefore emit a **partial** analytics snapshot via
// `onPartial` as soon as the first two datasets resolve so the UI can paint
// its 5 cards immediately, and then update the snapshot once the token
// dataset arrives. The returned promise resolves with the final (full)
// snapshot.
//
// Results are cached per-wallet for ANALYTICS_TTL_MS so the 15s refresh
// interval does not re-spend the full fetch budget.
export interface ScanAnalyticsOptions {
  force?: boolean;
  onPartial?: (partial: WalletAnalytics) => void;
}

export const scanWalletAnalytics = async (
  address: string,
  options: ScanAnalyticsOptions = {},
): Promise<WalletAnalytics> => {
  if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");
  const cacheKey = address.toLowerCase();

  if (!options.force) {
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }

  // Kick off all three account-history fetches plus balance in parallel.
  // They share the rate-limit queue so the token-transfer fetch will
  // backpressure naturally without starving the others.
  const balancePromise = getWalletBalance(address);
  const normalPromise = fetchAccountDataset(address, "txlist");
  const internalPromise = fetchAccountDataset(address, "txlistinternal");
  const tokenPromise = fetchAccountDataset(address, "tokentx");

  // Phase 1: resolve the fast pieces and emit a partial snapshot.
  const [balanceEth, normalDs, internalDs] = await Promise.all([
    balancePromise,
    normalPromise,
    internalPromise,
  ]);
  const partialActivity: AllWalletActivity = {
    normal: normalDs.transactions,
    internal: internalDs.transactions,
    token: [],
    source:
      normalDs.meta.source === "blockscout" || internalDs.meta.source === "blockscout"
        ? "blockscout"
        : "etherscan-v2",
  };
  const partialMerged = mergeActivity(partialActivity);
  const partialContracts = await filterRealContracts(address, partialMerged.candidateCounterparties);
  const partial = buildAnalytics(address, balanceEth, partialActivity, partialContracts);
  options.onPartial?.(partial);

  // Phase 2: wait for token transfers and emit the final snapshot.
  const tokenDs = await tokenPromise;
  const fullActivity: AllWalletActivity = {
    normal: normalDs.transactions,
    internal: internalDs.transactions,
    token: tokenDs.transactions,
    source:
      normalDs.meta.source === "blockscout" ||
      internalDs.meta.source === "blockscout" ||
      tokenDs.meta.source === "blockscout"
        ? "blockscout"
        : "etherscan-v2",
  };
  const fullMerged = mergeActivity(fullActivity);
  const fullContracts = await filterRealContracts(address, fullMerged.candidateCounterparties);
  const full = buildAnalytics(address, balanceEth, fullActivity, fullContracts);

  analyticsCache.set(cacheKey, { expiresAt: Date.now() + ANALYTICS_TTL_MS, value: full });
  return full;
};

// Get wallet transaction history from an indexed source; Base RPC does not expose account history.
export const getWalletTransactions = async (address: string, limit = 5): Promise<Transaction[]> => {
  try {
    if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");

    const baseParams: Record<string, string> = {
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: String(limit),
      sort: "desc",
    };

    const v2Params = new URLSearchParams({ chainid: BASE_CHAIN_ID, ...baseParams });
    const basescanKey = import.meta.env.VITE_BASESCAN_API_KEY;
    if (basescanKey) v2Params.set("apikey", basescanKey);
    const blockscoutParams = new URLSearchParams(baseParams);

    const indexerUrls = [
      `${ETHERSCAN_V2_API_URL}?${v2Params.toString()}`,
      `${BLOCKSCOUT_API_URL}?${blockscoutParams.toString()}`,
    ];

    for (const url of indexerUrls) {
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && Array.isArray(data.result)) {
        console.log(`Fetched ${data.result.length} indexed Base transactions for ${address}`);
        return data.result.map(mapIndexerTransaction).slice(0, limit);
      }
      console.warn("Base transaction indexer response:", data?.message || data?.status || response.statusText);
    }

    throw new Error("Unable to fetch Base transaction history from the configured indexers.");
  } catch (error) {
    console.error("Failed to get wallet transactions:", error);
    throw error;
  }
};

// Add Base network to wallet
export const addBaseNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found. Please install MetaMask.");
  }
  
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${parseInt(BASE_TESTNET.chainId).toString(16)}`,
          chainName: BASE_TESTNET.name,
          nativeCurrency: {
            name: BASE_TESTNET.currency.name,
            symbol: BASE_TESTNET.currency.symbol,
            decimals: BASE_TESTNET.currency.decimals,
          },
          rpcUrls: [BASE_TESTNET.rpcUrl],
          blockExplorerUrls: [BASE_TESTNET.blockExplorerUrl],
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("Failed to add Base network:", error);
    return false;
  }
};

// Deploy a smart contract - Fixed bytecode handling
export const deployContract = async (
  abi: any[],
  bytecode: string,
  signer: ethers.Signer,
  constructorArgs: unknown[] = [],
) => {
  try {
    console.log("Deploying contract with signer:", signer);
    console.log("ABI length:", abi.length);
    console.log("Bytecode length:", bytecode.length);
    console.log("Constructor args:", constructorArgs);

    // Ensure bytecode is properly formatted with 0x prefix
    const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
    
    // Validate bytecode format
    try {
      // Verify this is a valid hex string that ethers can handle
      ethers.getBytes(formattedBytecode);
    } catch (error) {
      console.error("Invalid bytecode format:", error);
      throw new Error("Invalid bytecode format. Please recompile the contract.");
    }
    
    // Create a contract factory with the ABI, bytecode, and signer
    const factory = new ethers.ContractFactory(abi, formattedBytecode, signer);
    console.log("Contract factory created");
    
    // Deploy the contract - this will trigger a transaction signature request
    console.log("Deploying contract...");
    const contract = await factory.deploy(...constructorArgs);
    console.log("Deployment transaction sent, waiting for confirmation...");
    
    // Wait for the contract to be deployed
    await contract.waitForDeployment();
    console.log("Contract deployed!");
    
    // Get the deployed contract address and transaction hash
    const address = await contract.getAddress();
    const txHash = contract.deploymentTransaction()?.hash || '';
    
    console.log("Deployed at address:", address);
    console.log("Deployment transaction hash:", txHash);
    
    return {
      address: address,
      deploymentTx: txHash,
    };
  } catch (error) {
    console.error("Failed to deploy contract:", error);
    throw error;
  }
};

export const estimateDeploymentCost = async (
  abi: any[],
  bytecode: string,
  signer: ethers.Signer,
  constructorArgs: unknown[] = [],
): Promise<DeploymentCostEstimate> => {
  const provider = signer.provider;
  if (!provider) throw new Error("No wallet provider available for gas estimation.");

  const network = await provider.getNetwork();
  console.log("Base deployment chainId:", network.chainId.toString());

  if (network.chainId !== BigInt(BASE_TESTNET.chainId)) {
    throw new Error(`Wrong network. Please switch to Base Mainnet (chainId ${BASE_TESTNET.chainId}).`);
  }

  const userAddress = await signer.getAddress();
  const balance = await provider.getBalance(userAddress);
  console.log("Base deployment balance:", ethers.formatEther(balance));

  const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
  try {
    ethers.getBytes(formattedBytecode);
  } catch (error) {
    console.error("Invalid bytecode format:", error);
    throw new Error("Invalid bytecode format. Please recompile the contract.");
  }

  const factory = new ethers.ContractFactory(abi, formattedBytecode, signer);
  let estimatedGas: bigint;

  try {
    const deployTransaction = await factory.getDeployTransaction(...constructorArgs);
    estimatedGas = await signer.estimateGas(deployTransaction);
  } catch (error: any) {
    console.error("Deployment gas estimation failed:", error);
    throw new Error(error?.shortMessage || error?.reason || error?.message || "Gas estimation failed.");
  }

  console.log("Base deployment estimated gas:", estimatedGas.toString());

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
  if (!gasPrice) throw new Error("Unable to fetch current Base Mainnet gas price.");

  const totalCost = estimatedGas * gasPrice;

  return {
    chainId: network.chainId,
    balance,
    estimatedGas,
    gasPrice,
    totalCost,
    balanceEth: ethers.formatEther(balance),
    estimatedCostEth: ethers.formatEther(totalCost),
    gasPriceGwei: ethers.formatUnits(gasPrice, "gwei"),
  };
};

// Check if wallet has enough balance to deploy a contract
export const hasEnoughBalance = async (address: string, estimatedGas = "0.01") => {
  try {
    const balance = await getWalletBalance(address);
    return parseFloat(balance) >= parseFloat(estimatedGas);
  } catch (error) {
    console.error("Failed to check balance:", error);
    return false;
  }
};

// Format wallet address for display (0x1234...5678)
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};
