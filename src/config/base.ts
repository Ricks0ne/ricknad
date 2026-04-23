
import { NetworkInfo } from "../types/blockchain";

// Base Mainnet Configuration
export const BASE_TESTNET: NetworkInfo = {
  chainId: "8453",
  name: "Base",
  rpcUrl: "https://mainnet.base.org",
  blockExplorerUrl: "https://basescan.org",
  faucet: "https://www.base.org/",
  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

// Resource Links
export const BASE_RESOURCES = {
  documentation: "https://docs.base.org/",
  github: "https://github.com/base-org",
  explorer: "https://basescan.org/",
  blog: "https://base.mirror.xyz/",
  faucet: "https://www.base.org/"
};

// Default Solidity Example for Contract Generator
export const DEFAULT_CONTRACT_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;
    
    event ValueChanged(uint256 newValue);
    
    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`;
