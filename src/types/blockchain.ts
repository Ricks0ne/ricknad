
export interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
}

export interface TokenBalance {
  token: string;
  balance: string;
  symbol: string;
  decimals: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: string;
}

export interface SmartContract {
  address: string;
  abi: any[];
  bytecode: string;
  deploymentTx: string;
}

export interface NetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  faucet: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
