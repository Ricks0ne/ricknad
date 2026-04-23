
import { NetworkInfo } from "../types/blockchain";

// Base Sepolia Configuration
export const BASE_TESTNET: NetworkInfo = {
  chainId: "1284",
  name: "Base Sepolia",
  rpcUrl: "https://testnet-rpc.base.org",
  blockExplorerUrl: "https://testnet.basescan.org",
  faucet: "https://testnet.base.org/",
  currency: {
    name: "Base",
    symbol: "BASE",
    decimals: 18,
  },
};

// Resource Links
export const BASE_RESOURCES = {
  documentation: "https://docs.base.org/",
  github: "https://github.com/monad-developers",
  explorer: "https://testnet.basescan.org/",
  blog: "https://www.base.org/blog",
  faucet: "https://testnet.base.org/"
};

// Default Solidity Example for Contract Generator
export const DEFAULT_CONTRACT_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

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
