
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MONAD_TESTNET } from '../../config/monad';
import { toast } from 'sonner';
import { addMonadNetwork } from '@/utils/blockchain';

// Define context type
interface Web3ContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  chainId: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

// Create context with default values
const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnecting: false,
  isConnected: false,
  error: null,
});

// Hook to use the Web3 context
export const useWeb3 = () => useContext(Web3Context);

// Web3 Provider component
export const Web3Provider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        // Create a provider for Monad Testnet
        const provider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrl);
        setProvider(provider);
      } catch (error) {
        console.error("Failed to initialize provider:", error);
        setError("Failed to initialize Web3 provider");
      }
    };

    initProvider();
  }, []);

  // Check if wallet is already connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(ethersProvider);
            
            const account = accounts[0];
            setAccount(account);
            
            const signer = await ethersProvider.getSigner();
            setSigner(signer);
            
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(chainId);
            
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };
    
    checkConnection();
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        toast.error("No Ethereum provider found. Please install MetaMask or another compatible wallet.");
        setError("No Ethereum provider found. Please install MetaMask");
        setIsConnecting(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get the connected account
      const account = accounts[0];
      setAccount(account);
      
      // Get the chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);
      
      // Check if we need to switch to Monad Testnet
      const targetChainId = `0x${parseInt(MONAD_TESTNET.chainId).toString(16)}`;
      if (chainId !== targetChainId) {
        try {
          // Try to switch to Monad Testnet
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
          
          // Update chain ID after switching
          setChainId(targetChainId);
        } catch (switchError: any) {
          // If the chain is not added to MetaMask, add it
          if (switchError.code === 4902) {
            try {
              await addMonadNetwork();
              toast.success("Monad Testnet added to your wallet");
            } catch (addError) {
              console.error("Failed to add Monad network:", addError);
              toast.error("Failed to add Monad network to your wallet");
              throw addError;
            }
          } else {
            throw switchError;
          }
        }
      }
      
      // Create Web3Provider from the current provider
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethersProvider);
      
      // Get the signer
      const signer = await ethersProvider.getSigner();
      setSigner(signer);
      
      setIsConnected(true);
      toast.success("Wallet connected successfully!");
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet");
      toast.error(error.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setIsConnected(false);
    toast.info("Wallet disconnected");
    
    // Reinitialize the read-only provider for Monad Testnet
    try {
      const provider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrl);
      setProvider(provider);
    } catch (error) {
      console.error("Failed to reinitialize provider:", error);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet();
        } else if (isConnected) {
          // User switched accounts
          setAccount(accounts[0]);
          toast.info("Account changed");
        }
      };

      const handleChainChanged = (chainId: string) => {
        // Handle chain change
        setChainId(chainId);
        toast.info("Network changed");
        
        // Check if the new chain is Monad Testnet
        const targetChainId = `0x${parseInt(MONAD_TESTNET.chainId).toString(16)}`;
        if (chainId !== targetChainId && isConnected) {
          toast.warning("Please switch to Monad Testnet for full functionality");
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isConnected]);

  // Context value
  const contextValue: Web3ContextType = {
    provider,
    signer,
    account,
    chainId,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConnected,
    error,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};
