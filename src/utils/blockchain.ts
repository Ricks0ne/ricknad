
import { ethers } from "ethers";
import { BASE_TESTNET } from "../config/base";
import { Transaction } from "../types/blockchain";

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
  uniqueContractsInteracted: number;
  firstActivityTimestamp: number | null;
  lastActivityTimestamp: number | null;
  walletAgeMs: number | null;
  transactions: Transaction[];
  source: "etherscan-v2" | "blockscout";
}

const BASESCAN_MAX_OFFSET = 10000;

interface RawBaseScanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  timeStamp: string;
  blockNumber?: string;
  isError?: string;
  txreceipt_status?: string;
  contractAddress?: string;
  functionName?: string;
  input?: string;
}

const buildEtherscanV2TxListUrl = (address: string, params: Record<string, string>): string => {
  const key = import.meta.env.VITE_BASESCAN_API_KEY;
  const search = new URLSearchParams({
    chainid: BASE_CHAIN_ID,
    module: "account",
    action: "txlist",
    address,
    startblock: "0",
    endblock: "99999999",
    ...params,
  });
  if (key) search.set("apikey", key);
  return `${ETHERSCAN_V2_API_URL}?${search.toString()}`;
};

const buildBlockscoutTxListUrl = (address: string, params: Record<string, string>): string => {
  const search = new URLSearchParams({
    module: "account",
    action: "txlist",
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

const fetchTxListPage = async (url: string): Promise<RawBaseScanTx[] | "empty"> => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Transaction indexer responded with ${response.status}: ${response.statusText}`);
  }

  // Etherscan-compatible API: status "0" is an error or "no results" signal.
  if (data.status === "0") {
    const msg: string = typeof data.message === "string" ? data.message : "";
    const resultMsg: string = typeof data.result === "string" ? data.result : "";
    const combined = `${msg} ${resultMsg}`.trim();
    if (msg.toLowerCase().includes("no transactions found")) return "empty";
    if (isRateLimitMessage(combined)) throw new RateLimitError();
    if (isPlanLimitMessage(combined) || isDeprecatedEndpointMessage(combined)) {
      throw new PlanNotCoveredError(resultMsg || msg);
    }
    throw new Error(resultMsg || msg || "Transaction indexer request failed.");
  }

  return Array.isArray(data.result) ? (data.result as RawBaseScanTx[]) : [];
};

export interface TxListFetchMeta {
  source: "etherscan-v2" | "blockscout";
  fallbackReason?: string;
}

export interface TxListFetchResult {
  transactions: RawBaseScanTx[];
  meta: TxListFetchMeta;
}

// Fetch the complete sorted-ASC transaction history for a Base Mainnet address.
// Primary source: Etherscan V2 multichain API (`chainid=8453`). This requires
// an API key on a plan that covers Base Mainnet.
// Fallback: Blockscout's Etherscan-compatible API, which is free and keyless
// but slower/less structured. We fall back automatically on plan-limit and
// deprecated-endpoint errors so free-tier keys still yield usable analytics.
// Paginates in chunks of BASESCAN_MAX_OFFSET so we get the true total count
// and the accurate first-activity timestamp.
export const fetchBaseScanTxList = async (address: string): Promise<TxListFetchResult> => {
  if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");

  // Cap chunks to avoid runaway fetches for ultra-active addresses.
  const MAX_CHUNKS = 10;

  // Block-based continuation instead of page-based pagination: Etherscan V2
  // and Blockscout both cap `page * offset <= 10000`, so naive pagination
  // fails on page 2. Instead, after a full 10k-result chunk, we advance
  // `startblock` past the last returned block and request again.
  const runPaginated = async (
    buildUrl: (params: Record<string, string>) => string,
  ): Promise<RawBaseScanTx[]> => {
    const all: RawBaseScanTx[] = [];
    let startblock = "0";
    for (let chunk = 0; chunk < MAX_CHUNKS; chunk += 1) {
      const url = buildUrl({
        sort: "asc",
        page: "1",
        offset: String(BASESCAN_MAX_OFFSET),
        startblock,
      });
      const batch = await fetchTxListPage(url);
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

  try {
    const transactions = await runPaginated((params) =>
      buildEtherscanV2TxListUrl(address, params),
    );
    return { transactions, meta: { source: "etherscan-v2" } };
  } catch (err) {
    if (err instanceof PlanNotCoveredError) {
      console.warn(
        "Etherscan V2 refused Base Mainnet for this key (free-tier / deprecated). Falling back to Blockscout.",
      );
      const transactions = await runPaginated((params) =>
        buildBlockscoutTxListUrl(address, params),
      );
      return {
        transactions,
        meta: { source: "blockscout", fallbackReason: err.message },
      };
    }
    throw err;
  }
};

const mapBaseScanTx = (tx: RawBaseScanTx): Transaction => ({
  hash: tx.hash,
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

// Full wallet analytics per the Ricknad BaseScan integration spec:
// - Balance via RPC eth_getBalance
// - Transaction history via BaseScan txlist (module=account, sort=asc)
// - totalTransactions, walletAge, firstActivity, uniqueContracts, lastActivity derived from the list
export const scanWalletAnalytics = async (address: string): Promise<WalletAnalytics> => {
  if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");

  const [balanceEth, txListResult] = await Promise.all([
    getWalletBalance(address),
    fetchBaseScanTxList(address),
  ]);

  const rawTxs = txListResult.transactions;
  const transactions = rawTxs.map(mapBaseScanTx);
  const first = rawTxs[0];
  const last = rawTxs[rawTxs.length - 1];

  const uniqueContracts = new Set<string>();
  for (const tx of rawTxs) {
    // "to" is empty for contract-creation txs; those have a contractAddress instead.
    // Either way, dedupe non-empty targets so we match the spec's "Unique Contract Interactions".
    const target = (tx.to || tx.contractAddress || "").toLowerCase();
    if (target) uniqueContracts.add(target);
  }

  return {
    address,
    balanceEth,
    totalTransactions: rawTxs.length,
    uniqueContractsInteracted: uniqueContracts.size,
    firstActivityTimestamp: first?.timeStamp ? Number(first.timeStamp) * 1000 : null,
    lastActivityTimestamp: last?.timeStamp ? Number(last.timeStamp) * 1000 : null,
    walletAgeMs: first?.timeStamp ? Date.now() - Number(first.timeStamp) * 1000 : null,
    transactions,
    source: txListResult.meta.source,
  };
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
