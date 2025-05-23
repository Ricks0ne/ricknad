
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
  name?: string;
  abi: any[];
  bytecode: string;
  deploymentTx?: string; // Changed from required to optional
  timestamp?: number;
  type?: ContractType;
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

export type ContractType = 
  | 'erc20' 
  | 'erc20Upgradeable'
  | 'erc721' 
  | 'erc1155' 
  | 'erc4626' 
  | 'staking' 
  | 'governance' 
  | 'dao'
  | 'proxy' 
  | 'escrow' 
  | 'multisig'
  | 'timelock'
  | 'vesting'
  | 'upgradeable'
  | 'soulbound'
  | 'airdrop'
  | 'custom';

export type ContractFeature = 
  | 'pausable' 
  | 'ownable' 
  | 'mintable' 
  | 'burnable' 
  | 'capped' 
  | 'roles' 
  | 'timelock'
  | 'batchable'
  | 'uups'
  | 'transparentUpgradeable'
  | 'diamond'
  | 'merkleProof'
  | 'royalties'
  | 'permit'
  | 'metadata'
  | 'reveal'
  | 'soulbound'
  | 'votingDelay'
  | 'quorum'
  | 'cliffVesting';

export interface ContractTemplate {
  name: string;
  type: ContractType;
  features: ContractFeature[];
  code: string;
}

export interface DeployedContract {
  name: string;
  address: string;
  abi: any[];
  bytecode: string;
  deploymentTx?: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  type: ContractType;
  sourceCode?: string;
  verificationStatus?: 'unverified' | 'pending' | 'success' | 'failure';
}
