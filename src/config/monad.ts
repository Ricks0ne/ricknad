
import { NetworkInfo } from "../types/blockchain";

// Monad Testnet Configuration
export const MONAD_TESTNET: NetworkInfo = {
  chainId: "1284",
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  blockExplorerUrl: "https://testnet.monadexplorer.com",
  faucet: "https://testnet.monad.xyz/",
  currency: {
    name: "Monad",
    symbol: "MONAD",
    decimals: 18,
  },
};

// Resource Links
export const MONAD_RESOURCES = {
  documentation: "https://docs.monad.xyz/",
  github: "https://github.com/monad-developers",
  explorer: "https://testnet.monadexplorer.com/",
  blog: "https://www.monad.xyz/blog",
  faucet: "https://testnet.monad.xyz/"
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
