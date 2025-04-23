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

// Get wallet transaction history - improved with more robust block search
export const getWalletTransactions = async (address: string, limit = 10): Promise<Transaction[]> => {
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    console.log("Current block number:", blockNumber);
    
    // Get recent blocks
    const transactions: Transaction[] = [];
    let blocksToSearch = 50; // Increased to find more transactions
    
    for (let i = 0; i < blocksToSearch && blockNumber - i >= 0; i++) {
      console.log(`Fetching block ${blockNumber - i}`);
      const block = await provider.getBlock(blockNumber - i);
      
      if (block && block.transactions) {
        console.log(`Block ${blockNumber - i} has ${block.transactions.length} transactions`);
        
        // Process each transaction in the block
        for (const txHash of block.transactions) {
          try {
            const tx = await provider.getTransaction(txHash);
            if (!tx) continue;
            
            // Check if the transaction involves our address
            if (tx.from?.toLowerCase() === address.toLowerCase() || 
                (tx.to && tx.to.toLowerCase() === address.toLowerCase())) {
              
              // Get transaction receipt for status
              const receipt = await provider.getTransactionReceipt(txHash);
              const status = receipt ? (receipt.status ? 'success' : 'failed') : 'pending';
              
              // Get the timestamp from the block
              const txBlock = tx.blockNumber ? await provider.getBlock(tx.blockNumber) : null;
              const timestamp = txBlock ? txBlock.timestamp * 1000 : Date.now();
              
              // Add to our transactions array
              transactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || '',
                value: ethers.formatEther(tx.value),
                timestamp: timestamp,
                status: status
              });
              
              // If we have enough transactions, return the result
              if (transactions.length >= limit) {
                console.log(`Found ${transactions.length} transactions for ${address}`);
                return transactions;
              }
            }
          } catch (txError) {
            console.error(`Error processing transaction ${txHash}:`, txError);
            continue; // Skip to next transaction if there's an error with this one
          }
        }
      }
    }
    
    console.log(`Found ${transactions.length} transactions for ${address}`);
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
