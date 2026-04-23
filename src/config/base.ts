
import { NetworkInfo } from "../types/blockchain";

// Base Mainnet Configuration
export const BASE_MAINNET: NetworkInfo = {
  chainId: "8453",
  name: "Base Mainnet",
  rpcUrl: "https://mainnet.base.org",
  blockExplorerUrl: "https://basescan.org",
  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

// Backwards-compatible alias used across the codebase
export const BASE_TESTNET = BASE_MAINNET;

// Resource Links — sourced from https://docs.base.org
export const BASE_RESOURCES = {
  documentation: "https://docs.base.org/",
  github: "https://github.com/base-org",
  explorer: "https://basescan.org/",
  blog: "https://base.mirror.xyz/",
  bridge: "https://bridge.base.org/",
  ecosystem: "https://www.base.org/ecosystem",
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
