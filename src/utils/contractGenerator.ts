import { ContractTemplate, ContractType, ContractFeature } from "@/types/blockchain";

// Generate contract code based on the user's request
export const generateContract = (prompt: string): { code: string; name: string; type: ContractType } => {
  const promptLC = prompt.toLowerCase();
  const seed = Math.floor(Math.random() * 10000);
  const currentDate = new Date().toISOString();
  
  // Determine contract name
  let contractName = "GeneratedContract";
  let contractType: ContractType = "custom";
  
  // Enhanced pattern detection with more contract types
  if (promptLC.includes("erc20") || promptLC.includes("token") || promptLC.includes("fungible")) {
    contractName = "RickToken";
    contractType = "erc20";
  } else if (promptLC.includes("erc721") || promptLC.includes("nft") || promptLC.includes("collectible")) {
    contractName = "RickNFT";
    contractType = "erc721";
  } else if (promptLC.includes("erc1155") || (promptLC.includes("multi") && promptLC.includes("token"))) {
    contractName = "RickMultiToken";
    contractType = "erc1155";
  } else if (promptLC.includes("erc4626") || promptLC.includes("vault") || promptLC.includes("yield")) {
    contractName = "RickVault";
    contractType = "erc4626";
  } else if (promptLC.includes("staking") || promptLC.includes("stake") || promptLC.includes("reward")) {
    contractName = "RickStaking";
    contractType = "staking";
  } else if (promptLC.includes("governance") || promptLC.includes("dao") || promptLC.includes("voting")) {
    contractName = "RickGovernance";
    contractType = "governance";
  } else if (promptLC.includes("proxy") || promptLC.includes("upgradable") || promptLC.includes("upgradeable")) {
    contractName = "RickUpgradeable";
    contractType = "proxy";
  } else if (promptLC.includes("escrow") || promptLC.includes("lock") || promptLC.includes("timelock")) {
    contractName = "RickEscrow";
    contractType = "escrow";
  } else if (promptLC.includes("multisig") || promptLC.includes("multi-sig") || promptLC.includes("multi sig")) {
    contractName = "RickMultiSig";
    contractType = "multisig";
  }
  
  // Custom name extraction from prompt
  const nameMatch = prompt.match(/named\s+(\w+)|called\s+(\w+)|name\s+(\w+)|named\s+"([^"]+)"|called\s+"([^"]+)"|name\s+"([^"]+)"/i);
  if (nameMatch) {
    // Find the first non-undefined capture group
    const customName = Array.from(nameMatch).slice(1).find(group => group !== undefined);
    if (customName) {
      contractName = customName;
    }
  }
  
  // Extract features from prompt - Enhanced to detect more patterns
  const features: ContractFeature[] = [];
  if (promptLC.includes("pausable") || promptLC.includes("pause") || promptLC.includes("suspend")) features.push("pausable");
  if (promptLC.includes("ownable") || promptLC.includes("owner") || promptLC.includes("admin") || promptLC.includes("onlyadmin")) features.push("ownable");
  if (promptLC.includes("mintable") || promptLC.includes("mint") || promptLC.includes("create new")) features.push("mintable");
  if (promptLC.includes("burnable") || promptLC.includes("burn") || promptLC.includes("destroy")) features.push("burnable");
  if ((promptLC.includes("cap") || promptLC.includes("limit")) && (promptLC.includes("supply") || promptLC.includes("total"))) features.push("capped");
  if (promptLC.includes("role") || promptLC.includes("access control") || promptLC.includes("permission")) features.push("roles");
  if (promptLC.includes("time") || promptLC.includes("lock") || promptLC.includes("delay")) features.push("timelock");
  if (promptLC.includes("batch") || promptLC.includes("multiple") || promptLC.includes("bulk")) features.push("batchable");
  if (promptLC.includes("uups") || promptLC.includes("universal upgradeable proxy")) features.push("uups");
  if (promptLC.includes("transparent proxy") || promptLC.includes("transparent upgradeable proxy")) features.push("transparentUpgradeable");
  if (promptLC.includes("diamond") || promptLC.includes("erc2535") || promptLC.includes("facet")) features.push("diamond");
  if (promptLC.includes("merkle") || promptLC.includes("whitelist") || promptLC.includes("allowlist")) features.push("merkleProof");
  if (promptLC.includes("royalty") || promptLC.includes("fee") || promptLC.includes("erc2981")) features.push("royalties");
  if (promptLC.includes("permit") || promptLC.includes("signature") || promptLC.includes("gasless")) features.push("permit");
  
  // Choose the appropriate template based on type and features
  let code: string;
  
  switch (contractType) {
    case "erc20":
      code = generateERC20Token(contractName, features, prompt, seed, currentDate);
      break;
    case "erc721":
      code = generateERC721Token(contractName, features, prompt, seed, currentDate);
      break;
    case "erc1155":
      code = generateERC1155Token(contractName, features, prompt, seed, currentDate);
      break;
    case "erc4626":
      code = generateERC4626Vault(contractName, features, prompt, seed, currentDate);
      break;
    case "staking":
      code = generateStakingContract(contractName, features, prompt, seed, currentDate);
      break;
    case "governance":
      code = generateGovernanceContract(contractName, features, prompt, seed, currentDate);
      break;
    case "proxy":
      code = generateUpgradeableContract(contractName, features, prompt, seed, currentDate);
      break;
    case "escrow":
      code = generateEscrowContract(contractName, features, prompt, seed, currentDate);
      break;
    case "multisig":
      code = generateMultiSigWallet(contractName, features, prompt, seed, currentDate);
      break;
    default:
      code = generateCustomContract(contractName, features, prompt, seed, currentDate);
  }
  
  return {
    code,
    name: contractName,
    type: contractType
  };
};

// Generate ERC20 token contract
const generateERC20Token = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [`import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`];
  let inheritance = ["ERC20"];
  let variables = [];
  let constructor = [];
  let functions = [];
  
  // Add features
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
    functions.push(`
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`);
  }
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  if (features.includes("roles")) {
    imports.push(`import "@openzeppelin/contracts/access/AccessControl.sol";`);
    inheritance = inheritance.filter(i => i !== "Ownable"); // Replace Ownable with AccessControl
    inheritance.push("AccessControl");
    variables.push(`bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");`);
    constructor.push(`_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);`);
  }
  
  if (features.includes("mintable")) {
    if (features.includes("roles")) {
      functions.push(`
    function mint(address to, uint256 amount) public {
        if (hasRole(MINTER_ROLE, msg.sender)) {
            _mint(to, amount);
        } else {
            revert("Must have minter role to mint");
        }
    }`);
    } else {
      functions.push(`
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }`);
    }
  }
  
  if (features.includes("burnable")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";`);
    inheritance.push("ERC20Burnable");
  }
  
  if (features.includes("capped")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";`);
    inheritance = inheritance.filter(i => i !== "ERC20"); // Replace ERC20 with ERC20Capped
    inheritance.unshift("ERC20Capped");
    variables.push(`uint256 public immutable cap;`);
    constructor.push(`cap = 1000000 * 10 ** decimals();`);
  }
  
  if (features.includes("permit")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";`);
    inheritance.push("ERC20Permit");
    constructor.push(`// Permit initialization with domain separator`);
  }
  
  // Build the contract
  const inherits = inheritance.join(", ");
  const constructorArgs = features.includes("capped") ? 
    `uint256 initialSupply) ERC20("${contractName}", "${contractName.substring(0, 4)}") ERC20Capped(1000000 * 10 ** decimals())` : 
    features.includes("permit") ?
    `uint256 initialSupply) ERC20("${contractName}", "${contractName.substring(0, 4)}") ERC20Permit("${contractName}")` :
    `uint256 initialSupply) ERC20("${contractName}", "${contractName.substring(0, 4)}")`;
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev ERC20 Token Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inherits} {
    ${variables.join("\n    ")}
    
    constructor(${constructorArgs}) {
        ${constructor.join("\n        ")}
        _mint(msg.sender, initialSupply);
    }
    ${functions.join("\n    ")}
}`;
};

// Generate ERC721 NFT contract
const generateERC721Token = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [`import "@openzeppelin/contracts/token/ERC721/ERC721.sol";`];
  let inheritance = ["ERC721"];
  let variables = [`uint256 public nextTokenId;`];
  let constructor = [];
  let functions = [];
  
  // Add URI storage if needed
  if (prompt.toLowerCase().includes("metadata") || prompt.toLowerCase().includes("uri")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";`);
    inheritance.push("ERC721URIStorage");
    
    if (features.includes("mintable")) {
      functions.push(`
    function mint(address to, string memory tokenURI) public onlyOwner {
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        nextTokenId++;
    }`);
    }
  } else if (features.includes("mintable")) {
    functions.push(`
    function mint(address to) public onlyOwner {
        _safeMint(to, nextTokenId);
        nextTokenId++;
    }`);
  }
  
  // Add features
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
    functions.push(`
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`);
  }
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  if (features.includes("burnable")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";`);
    inheritance.push("ERC721Burnable");
  }
  
  if (features.includes("royalties")) {
    imports.push(`import "@openzeppelin/contracts/token/common/ERC2981.sol";`);
    inheritance.push("ERC2981");
    constructor.push(`// Set default royalty to 2.5%
        _setDefaultRoyalty(msg.sender, 250);`);
    functions.push(`
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    
    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }`);
  }
  
  if (features.includes("roles")) {
    imports.push(`import "@openzeppelin/contracts/access/AccessControl.sol";`);
    inheritance = inheritance.filter(i => i !== "Ownable"); // Replace Ownable with AccessControl
    inheritance.push("AccessControl");
    variables.push(`bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");`);
    constructor.push(`_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);`);
    
    // Update mint function for roles
    if (prompt.toLowerCase().includes("metadata") || prompt.toLowerCase().includes("uri")) {
      functions = functions.filter(f => !f.includes("mint(address to, string memory tokenURI)"));
      functions.push(`
    function mint(address to, string memory tokenURI) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Must have minter role");
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        nextTokenId++;
    }`);
    } else {
      functions = functions.filter(f => !f.includes("mint(address to)"));
      functions.push(`
    function mint(address to) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Must have minter role");
        _safeMint(to, nextTokenId);
        nextTokenId++;
    }`);
    }
  }
  
  // Add enumerable extension
  if (prompt.toLowerCase().includes("enumerable") || prompt.toLowerCase().includes("enumerate") || 
      prompt.toLowerCase().includes("list") || prompt.toLowerCase().includes("owned")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";`);
    // Place ERC721Enumerable before other extensions
    inheritance = inheritance.filter(i => i !== "ERC721");
    inheritance.unshift("ERC721", "ERC721Enumerable");
    
    // Add convenience function to get all tokens owned by an account
    functions.push(`
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }`);
  }
  
  // Add batch minting for better gas efficiency
  if (features.includes("batchable")) {
    functions.push(`
    function mintBatch(address to, uint256 count) public onlyOwner {
        for (uint256 i = 0; i < count; i++) {
            _safeMint(to, nextTokenId + i);
        }
        nextTokenId += count;
    }`);
  }
  
  // Override function implementations for compatibility
  let overrides = [];
  const hasEnumerable = inheritance.includes("ERC721Enumerable");
  const hasURIStorage = inheritance.includes("ERC721URIStorage");
  
  if (hasEnumerable && hasURIStorage) {
    overrides.push(`
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        ${features.includes("pausable") ? "whenNotPaused " : ""}
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable${features.includes("royalties") ? ", ERC2981" : ""})
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }`);
  } else if (hasEnumerable) {
    overrides.push(`
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        ${features.includes("pausable") ? "whenNotPaused " : ""}
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable${features.includes("royalties") ? ", ERC2981" : ""})
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
  } else if (hasURIStorage) {
    overrides.push(`
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721${features.includes("royalties") ? ", ERC2981" : ""})
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
  } else if (features.includes("royalties")) {
    overrides.push(`
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
  }
  
  // Build the contract
  const inherits = inheritance.join(", ");
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev ERC721 NFT Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inherits} {
    ${variables.join("\n    ")}
    
    constructor() ERC721("${contractName}", "${contractName.substring(0, 4)}") {
        ${constructor.join("\n        ")}
    }
    ${functions.join("\n    ")}
    ${overrides.join("\n    ")}
}`;
};

// Generate ERC1155 Multi-token contract
const generateERC1155Token = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [`import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";`];
  let inheritance = ["ERC1155"];
  let variables = [];
  let constructor = [];
  let functions = [];
  
  // Add URI handling
  if (prompt.toLowerCase().includes("uri") || prompt.toLowerCase().includes("metadata")) {
    functions.push(`
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }`);
  }
  
  if (features.includes("mintable")) {
    functions.push(`
    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyOwner {
        _mint(account, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }`);
  }
  
  // Add features
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
    functions.push(`
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`);
  }
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  if (features.includes("burnable")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";`);
    inheritance.push("ERC1155Burnable");
  }

  // Advanced features for ERC1155
  if (features.includes("roles")) {
    imports.push(`import "@openzeppelin/contracts/access/AccessControl.sol";`);
    inheritance = inheritance.filter(i => i !== "Ownable"); // Replace Ownable with AccessControl
    inheritance.push("AccessControl");
    variables.push(`bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");`);
    
    constructor.push(`_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);`);
    
    // Update functions to use roles
    functions = functions.filter(f => !f.includes("mint(") && !f.includes("setURI("));
    
    functions.push(`
    function mint(address account, uint256 id, uint256 amount, bytes memory data) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Must have minter role");
        _mint(account, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Must have minter role");
        _mintBatch(to, ids, amounts, data);
    }
    
    function setURI(string memory newuri) public {
        require(hasRole(URI_SETTER_ROLE, msg.sender), "Must have URI setter role");
        _setURI(newuri);
    }`);
  }
  
  if (features.includes("royalties")) {
    imports.push(`import "@openzeppelin/contracts/token/common/ERC2981.sol";`);
    inheritance.push("ERC2981");
    constructor.push(`// Set default royalty to 2.5%
        _setDefaultRoyalty(msg.sender, 250);`);
    functions.push(`
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    
    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155${features.includes("roles") ? ", AccessControl" : ""}${features.includes("royalties") ? ", ERC2981" : ""})
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
  } else if (features.includes("roles")) {
    functions.push(`
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
  }
  
  // Supply tracking
  if (prompt.toLowerCase().includes("supply") || prompt.toLowerCase().includes("track")) {
    imports.push(`import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";`);
    inheritance.push("ERC1155Supply");
    
    // Override _beforeTokenTransfer
    functions.push(`
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        ${features.includes("pausable") ? "whenNotPaused " : ""}
        override(ERC1155${inheritance.includes("ERC1155Supply") ? ", ERC1155Supply" : ""})
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }`);
  }
  
  // Build the contract
  const inherits = inheritance.join(", ");
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev ERC1155 Multi-Token Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inherits} {
    ${variables.join("\n    ")}
    
    constructor() ERC1155("https://token-cdn-domain/{id}.json") {
        ${constructor.join("\n        ")}
    }
    ${functions.join("\n    ")}
}`;
};

// New function: Generate ERC4626 Vault contract
const generateERC4626Vault = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [
    `import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";`,
    `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`
  ];
  
  let inheritance = ["ERC4626"];
  let variables = [];
  let constructor = [];
  let functions = [];
  
  // Add features
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
    functions.push(`
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`);
  }
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  // Fee mechanism
  if (prompt.toLowerCase().includes("fee") || prompt.toLowerCase().includes("yield")) {
    variables.push(`uint256 public feePercentage = 10; // 0.1% (in basis points)
    address public feeCollector;`);
    
    constructor.push(`feeCollector = msg.sender;`);
    
    functions.push(`
    function setFeePercentage(uint256 _feePercentage) public onlyOwner {
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%
        feePercentage = _feePercentage;
    }
    
    function setFeeCollector(address _feeCollector) public onlyOwner {
        feeCollector = _feeCollector;
    }
    
    function _beforeWithdraw(
        address caller,
        uint256 assets,
        uint256 shares
    ) internal override {
        uint256 fee = (assets * feePercentage) / 10000;
        if (fee > 0 && feeCollector != address(0)) {
            IERC20(asset()).transfer(feeCollector, fee);
        }
    }`);
  }
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev ERC4626 Tokenized Vault Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inheritance.join(", ")} {
    ${variables.join("\n    ")}
    
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        ${constructor.join("\n        ")}
    }
    
    ${functions.join("\n    ")}
}`;
};

// Generate staking contract
const generateStakingContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  let imports = [
    `import "@openzeppelin/contracts/token/ERC20/IERC20.sol";`,
    `import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";`,
    `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";`
  ];
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
  }
  
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
  }
  
  const inheritance = [
    "ReentrancyGuard",
    ...(features.includes("ownable") ? ["Ownable"] : []),
    ...(features.includes("pausable") ? ["Pausable"] : [])
  ];

  // Enhanced staking contract with more features
  const isMultiToken = prompt.toLowerCase().includes("multi") && 
                      (prompt.toLowerCase().includes("token") || prompt.toLowerCase().includes("reward"));
  
  // Check if timelock is needed
  const hasTimelock = prompt.toLowerCase().includes("timelock") || 
                      prompt.toLowerCase().includes("lock period") || 
                      prompt.toLowerCase().includes("vesting");
  
  // Variables
  let variables = [
    `// Staking token (what users deposit)
    IERC20 public stakingToken;
    
    // Reward token (what users earn)
    IERC20 public rewardToken;
    
    // Duration of rewards to be paid out (in seconds)
    uint256 public duration;
    
    // Timestamp when reward distribution ends
    uint256 public finishAt;
    
    // Minimum staking period (in seconds)
    uint256 public lockPeriod = 0;
    
    // Reward rate per second
    uint256 public rewardRate;
    
    // Last time reward amount was updated
    uint256 public lastUpdateTime;
    
    // Reward per token stored
    uint25
