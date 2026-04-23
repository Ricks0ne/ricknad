
import { NetworkInfo } from "../types/blockchain";

// Base Sepolia Testnet Configuration
export const BASE_TESTNET: NetworkInfo = {
  chainId: "84532",
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorerUrl: "https://sepolia.basescan.org",
  faucet: "https://www.alchemy.com/faucets/base-sepolia",
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
  explorer: "https://sepolia.basescan.org/",
  blog: "https://base.mirror.xyz/",
  faucet: "https://www.alchemy.com/faucets/base-sepolia"
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
