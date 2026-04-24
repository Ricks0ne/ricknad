
import { ethers } from "ethers";
import { BASE_TESTNET } from "../config/base";
import { Transaction } from "../types/blockchain";

const BASESCAN_API_URL = "https://api.basescan.org/api";
const BLOCKSCOUT_API_URL = "https://base.blockscout.com/api";

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

// Get wallet transaction history from an indexed source; Base RPC does not expose account history.
export const getWalletTransactions = async (address: string, limit = 5): Promise<Transaction[]> => {
  try {
    if (!isValidWalletAddress(address)) throw new Error("Invalid wallet address.");

    const params = new URLSearchParams({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: String(limit),
      sort: "desc",
    });

    const basescanKey = import.meta.env.VITE_BASESCAN_API_KEY;
    const indexerUrls = [
      basescanKey ? `${BASESCAN_API_URL}?${params.toString()}&apikey=${basescanKey}` : null,
      `${BLOCKSCOUT_API_URL}?${params.toString()}`,
    ].filter(Boolean) as string[];

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
export const deployContract = async (abi: any[], bytecode: string, signer: ethers.Signer) => {
  try {
    console.log("Deploying contract with signer:", signer);
    console.log("ABI length:", abi.length);
    console.log("Bytecode length:", bytecode.length);
    
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
    const contract = await factory.deploy();
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
    const deployTransaction = await factory.getDeployTransaction();
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
