
import { ethers } from "ethers";
import { MONAD_TESTNET } from "../config/monad";
import { Transaction } from "../types/blockchain";

// Initialize a provider for the Monad testnet
export const getProvider = () => {
  try {
    return new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrl);
  } catch (error) {
    console.error("Failed to initialize provider:", error);
    throw error;
  }
};

// Get wallet balance
export const getWalletBalance = async (address: string) => {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get wallet balance:", error);
    return "0";
  }
};

// Get wallet transaction history
export const getWalletTransactions = async (address: string, limit = 10): Promise<Transaction[]> => {
  try {
    // This is a simplified version - in a real app, you would use
    // a blockchain explorer API or index transactions yourself
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    
    // Get recent blocks
    const transactions: Transaction[] = [];
    for (let i = 0; i < 10 && blockNumber - i >= 0; i++) {
      const block = await provider.getBlock(blockNumber - i);
      if (block && block.transactions) {
        // In newer ethers versions, block.transactions is an array of transaction hashes (strings)
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          if (!tx) continue;
          
          if (tx.from.toLowerCase() === address.toLowerCase() || 
              (tx.to && tx.to.toLowerCase() === address.toLowerCase())) {
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || '',
              value: ethers.formatEther(tx.value),
              timestamp: new Date().getTime(), // This would normally come from block.timestamp
              status: 'confirmed'
            });
            
            if (transactions.length >= limit) {
              return transactions;
            }
          }
        }
      }
    }
    
    return transactions;
  } catch (error) {
    console.error("Failed to get wallet transactions:", error);
    return [];
  }
};

// Add Monad network to wallet
export const addMonadNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found. Please install MetaMask.");
  }
  
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: `0x${parseInt(MONAD_TESTNET.chainId).toString(16)}`,
          chainName: MONAD_TESTNET.name,
          nativeCurrency: {
            name: MONAD_TESTNET.currency.name,
            symbol: MONAD_TESTNET.currency.symbol,
            decimals: MONAD_TESTNET.currency.decimals,
          },
          rpcUrls: [MONAD_TESTNET.rpcUrl],
          blockExplorerUrls: [MONAD_TESTNET.blockExplorerUrl],
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("Failed to add Monad network:", error);
    return false;
  }
};

// Deploy a smart contract
export const deployContract = async (abi: any[], bytecode: string, signer: ethers.Signer) => {
  try {
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    return {
      address: await contract.getAddress(),
      deploymentTx: contract.deploymentTransaction()?.hash || '',
    };
  } catch (error) {
    console.error("Failed to deploy contract:", error);
    throw error;
  }
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
