
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
  gasUsed: string;
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
  realtimeRpcUrl?: string;
  blockExplorerUrl: string;
  faucet?: string;
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

/**
 * Compiler settings captured at compile time and stored with the deployed
 * contract so the Verify dialog can pre-populate the exact same values.
 * BaseScan re-compiles the submitted source and compares the resulting
 * bytecode against what's on-chain — any mismatch in these fields produces
 * `Fail - Unable to verify`, so they must be preserved verbatim.
 */
export interface CompileSettings {
  /** Full solc version string, e.g. `v0.8.20+commit.a1b79de6`. */
  compilerVersion: string;
  optimizerEnabled: boolean;
  optimizerRuns: number;
  /** `undefined` means "compiler default". */
  evmVersion?: string;
  /** Etherscan license type numeric code (see basescanVerification.ts). */
  licenseType?: number;
  /** OpenZeppelin `@openzeppelin/contracts` package version. */
  ozVersion?: string;
  /** OpenZeppelin `@openzeppelin/contracts-upgradeable` package version. */
  ozUpgradeableVersion?: string;
  /** Fully-qualified contract name, e.g. `contracts/MyToken.sol:MyToken`. */
  contractPath?: string;
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
  /** Settings used at compile time; enables one-click verify with no mismatches. */
  compileSettings?: CompileSettings;
  /** ABI-encoded constructor arguments (hex, no 0x prefix). Empty string if none. */
  constructorArguments?: string;
}
