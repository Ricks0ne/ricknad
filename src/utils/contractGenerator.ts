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
  
  // Variables - Fixed the incomplete variable declaration
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
    uint256 public rewardPerTokenStored;
    
    // User address => rewardPerTokenStored
    mapping(address => uint256) public userRewardPerTokenPaid;
    
    // User address => rewards to be claimed
    mapping(address => uint256) public rewards;
    
    // User address => staked amount
    mapping(address => uint256) public balanceOf;
    
    // Total staked
    uint256 public totalSupply;
    
    // User address => timestamp when they can unstake
    mapping(address => uint256) public unlockTime;`
  ];
  
  // Constructor for staking contract
  let constructor = [
    `stakingToken = _stakingToken;
        rewardToken = _rewardToken;
        
        // Set initial reward duration to 7 days
        duration = 7 days;`
  ];
  
  // Functions for staking contract
  let functions = [
    `// Update reward variables
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
    
    // Returns the last timestamp when rewards are applicable
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < finishAt ? block.timestamp : finishAt;
    }
    
    // Calculate the reward per token
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + (
            (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalSupply
        );
    }
    
    // Calculate earned rewards for an account
    function earned(address account) public view returns (uint256) {
        return (
            balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18
        ) + rewards[account];
    }
    
    // Stake tokens
    function stake(uint256 _amount) external ${features.includes("pausable") ? "whenNotPaused " : ""}nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Amount must be greater than 0");
        
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
        
        if (hasTimelock) {
            unlockTime[msg.sender] = block.timestamp + lockPeriod;
        }
        
        emit Staked(msg.sender, _amount);
    }
    
    // Withdraw staked tokens
    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf[msg.sender] >= _amount, "Insufficient balance");
        
        if (hasTimelock) {
            require(block.timestamp >= unlockTime[msg.sender], "Lock period has not expired");
        }
        
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        stakingToken.transfer(msg.sender, _amount);
        
        emit Withdrawn(msg.sender, _amount);
    }
    
    // Claim earned rewards
    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }
    
    // Added convenience function: Exit (withdraw everything + claim rewards)
    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }
    
    // Set reward duration (only owner)
    function setRewardsDuration(uint256 _duration) external onlyOwner {
        require(finishAt < block.timestamp, "Reward period ongoing");
        duration = _duration;
        emit RewardsDurationUpdated(_duration);
    }
    
    // Set lock period for staking (only owner)
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        lockPeriod = _lockPeriod;
        emit LockPeriodUpdated(_lockPeriod);
    }
    
    // Notify reward amount (add rewards to be distributed)
    function notifyRewardAmount(uint256 _amount) external onlyOwner updateReward(address(0)) {
        if (block.timestamp >= finishAt) {
            rewardRate = _amount / duration;
        } else {
            uint256 remainingRewards = (finishAt - block.timestamp) * rewardRate;
            rewardRate = (_amount + remainingRewards) / duration;
        }
        
        require(rewardRate > 0, "Reward rate must be greater than 0");
        
        // Check if the contract has enough balance to pay the rewards
        uint256 balance = rewardToken.balanceOf(address(this));
        require(
            rewardRate <= balance / duration,
            "Reward amount > balance"
        );
        
        lastUpdateTime = block.timestamp;
        finishAt = block.timestamp + duration;
        
        emit RewardAdded(_amount);
    }
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event LockPeriodUpdated(uint256 newLockPeriod);
    event RewardAdded(uint256 reward);`.replace("hasTimelock", hasTimelock.toString())
  ];
  
  // Build the contract
  const inherits = inheritance.join(", ");
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}
using SafeERC20 for IERC20;

/**
 * @title ${contractName}
 * @dev Staking Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inherits} {
    ${variables.join("\n    ")}
    
    constructor(
        IERC20 _stakingToken,
        IERC20 _rewardToken
    ) {
        ${constructor.join("\n        ")}
    }
    
    ${functions.join("\n    ")}
}`;
};

// Generate governance contract
const generateGovernanceContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [
    `import "@openzeppelin/contracts/governance/Governor.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";`
  ];
  
  const inheritance = [
    "Governor", 
    "GovernorCountingSimple", 
    "GovernorVotes", 
    "GovernorVotesQuorumFraction", 
    "GovernorTimelockControl"
  ];
  
  const votingDelay = prompt.toLowerCase().includes("quick") || prompt.toLowerCase().includes("fast") ? "1" : "7200"; // 1 block or ~1 day
  const votingPeriod = prompt.toLowerCase().includes("quick") || prompt.toLowerCase().includes("fast") ? "45818" : "50400"; // ~1 week or ~1 week
  const quorumNumerator = prompt.toLowerCase().includes("low quorum") ? "4" : "10"; // 4% or 10%
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Governance Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inheritance.join(", ")} {
    constructor(IVotes _token, TimelockController _timelock)
        Governor("${contractName}")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(${quorumNumerator})
        GovernorTimelockControl(_timelock)
    {}

    function votingDelay() public pure override returns (uint256) {
        return ${votingDelay}; // ${votingDelay === "1" ? "1 block" : "~1 day"}
    }

    function votingPeriod() public pure override returns (uint256) {
        return ${votingPeriod}; // ~1 week
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    // The functions below are overrides required by Solidity.
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }
    
    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`;
};

// Generate upgradeable contract
const generateUpgradeableContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const isUUPS = features.includes("uups");
  const isTransparent = features.includes("transparentUpgradeable");
  const isDiamond = features.includes("diamond");
  
  let proxyPattern = isUUPS ? "UUPS" : (isTransparent ? "TransparentUpgradeable" : (isDiamond ? "Diamond" : "UUPS"));
  
  let imports = [
    `import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";`,
    `import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";`
  ];
  
  let inheritance = ["Initializable", "OwnableUpgradeable"];
  
  // Add contract-specific imports and inheritance
  if (proxyPattern === "UUPS") {
    imports.push(`import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";`);
    inheritance.push("UUPSUpgradeable");
  }
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Upgradeable Contract (${proxyPattern}) auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inheritance.join(", ")} {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        ${proxyPattern === "UUPS" ? `__UUPSUpgradeable_init();` : ``}
    }

    ${proxyPattern === "UUPS" ? `
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}` : ``}

    // Your contract methods go here
    uint256 public value;
    
    function setValue(uint256 newValue) public onlyOwner {
        value = newValue;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`;
};

// Generate escrow contract
const generateEscrowContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  let imports = [
    `import "@openzeppelin/contracts/utils/math/SafeMath.sol";`,
    `import "@openzeppelin/contracts/token/ERC20/IERC20.sol";`,
    `import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";`
  ];
  
  let inheritance = [];
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
  }
  
  const inherits = inheritance.length > 0 ? ` is ${inheritance.join(", ")}` : "";
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Escrow Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName}${inherits} {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    struct Escrow {
        address depositor;
        address beneficiary;
        address arbiter;
        uint256 amount;
        bool released;
        bool refunded;
        uint256 createdAt;
        uint256 expiresAt;
        address token; // address(0) for Ether
    }
    
    mapping(bytes32 => Escrow) public escrows;
    uint256 public fee; // Fee in basis points (1/100 of a percent)
    address public feeRecipient;
    
    event EscrowCreated(
        bytes32 indexed id,
        address indexed depositor,
        address indexed beneficiary,
        address arbiter,
        uint256 amount,
        uint256 expiresAt,
        address token
    );
    
    event EscrowReleased(bytes32 indexed id);
    event EscrowRefunded(bytes32 indexed id);
    event FeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newFeeRecipient);
    
    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        fee = 25; // 0.25%
        feeRecipient = _feeRecipient;
    }
    
    function createEtherEscrow(
        address _beneficiary,
        address _arbiter,
        uint256 _expiresAt
    ) external payable ${features.includes("pausable") ? "whenNotPaused " : ""}returns (bytes32) {
        require(msg.value > 0, "Amount must be > 0");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_arbiter != address(0), "Invalid arbiter");
        require(_expiresAt > block.timestamp, "Expiry must be in future");
        
        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                _beneficiary,
                _arbiter,
                block.timestamp,
                msg.value
            )
        );
        
        uint256 feeAmount = msg.value.mul(fee).div(10000);
        uint256 depositAmount = msg.value.sub(feeAmount);
        
        if (feeAmount > 0) {
            payable(feeRecipient).transfer(feeAmount);
        }
        
        escrows[id] = Escrow({
            depositor: msg.sender,
            beneficiary: _beneficiary,
            arbiter: _arbiter,
            amount: depositAmount,
            released: false,
            refunded: false,
            createdAt: block.timestamp,
            expiresAt: _expiresAt,
            token: address(0)
        });
        
        emit EscrowCreated(
            id,
            msg.sender,
            _beneficiary,
            _arbiter,
            depositAmount,
            _expiresAt,
            address(0)
        );
        
        return id;
    }
    
    function createTokenEscrow(
        address _token,
        uint256 _amount,
        address _beneficiary,
        address _arbiter,
        uint256 _expiresAt
    ) external ${features.includes("pausable") ? "whenNotPaused " : ""}returns (bytes32) {
        require(_amount > 0, "Amount must be > 0");
        require(_token != address(0), "Invalid token");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_arbiter != address(0), "Invalid arbiter");
        require(_expiresAt > block.timestamp, "Expiry must be in future");
        
        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                _beneficiary,
                _arbiter,
                block.timestamp,
                _amount,
                _token
            )
        );
        
        uint256 feeAmount = _amount.mul(fee).div(10000);
        uint256 depositAmount = _amount.sub(feeAmount);
        
        // Transfer tokens to this contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Transfer fee to recipient
        if (feeAmount > 0) {
            IERC20(_token).safeTransfer(feeRecipient, feeAmount);
        }
        
        escrows[id] = Escrow({
            depositor: msg.sender,
            beneficiary: _beneficiary,
            arbiter: _arbiter,
            amount: depositAmount,
            released: false,
            refunded: false,
            createdAt: block.timestamp,
            expiresAt: _expiresAt,
            token: _token
        });
        
        emit EscrowCreated(
            id,
            msg.sender,
            _beneficiary,
            _arbiter,
            depositAmount,
            _expiresAt,
            _token
        );
        
        return id;
    }
    
    function release(bytes32 _id) external {
        Escrow storage escrow = escrows[_id];
        
        require(!escrow.released && !escrow.refunded, "Escrow already settled");
        require(
            msg.sender == escrow.arbiter || msg.sender == escrow.depositor,
            "Not authorized"
        );
        
        escrow.released = true;
        
        if (escrow.token == address(0)) {
            payable(escrow.beneficiary).transfer(escrow.amount);
        } else {
            IERC20(escrow.token).safeTransfer(escrow.beneficiary, escrow.amount);
        }
        
        emit EscrowReleased(_id);
    }
    
    function refund(bytes32 _id) external {
        Escrow storage escrow = escrows[_id];
        
        require(!escrow.released && !escrow.refunded, "Escrow already settled");
        require(
            (msg.sender == escrow.arbiter) || 
            (msg.sender == escrow.beneficiary) || 
            (msg.sender == escrow.depositor && block.timestamp >= escrow.expiresAt),
            "Not authorized or not expired"
        );
        
        escrow.refunded = true;
        
        if (escrow.token == address(0)) {
            payable(escrow.depositor).transfer(escrow.amount);
        } else {
            IERC20(escrow.token).safeTransfer(escrow.depositor, escrow.amount);
        }
        
        emit EscrowRefunded(_id);
    }
    
    // Admin functions
    ${features.includes("ownable") ? `
    function setFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5%
        fee = _fee;
        emit FeeUpdated(_fee);
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }` : ``}
    
    ${features.includes("pausable") ? `
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }` : ``}
}`;
};

// Generate multisig wallet
const generateMultiSigWallet = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const numOwners = prompt.match(/(\d+)\s+owners?/i) ? parseInt(prompt.match(/(\d+)\s+owners?/i)![1]) : 3;
  const numConfirmations = prompt.match(/(\d+)\s+confirmations?/i) ? parseInt(prompt.match(/(\d+)\s+confirmations?/i)![1]) : Math.ceil(numOwners / 2);
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title ${contractName}
 * @dev MultiSig Wallet Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} {
    event Deposit(address indexed sender, uint amount, uint balance);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event RequirementChange(uint required);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "Tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "Tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Tx already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "Invalid number of confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(
        address _to,
        uint _value,
        bytes memory _data
    ) public onlyOwner {
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Cannot execute tx"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "Tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

    function getTransaction(uint _txIndex)
        public
        view
        returns (
            address to,
            uint value,
            bytes memory data,
            bool executed,
            uint numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
    
    function addOwner(address _owner) public {
        require(msg.sender == address(this), "Only wallet can add owner");
        require(_owner != address(0), "Invalid owner");
        require(!isOwner[_owner], "Owner exists");
        
        isOwner[_owner] = true;
        owners.push(_owner);
        
        emit OwnerAddition(_owner);
    }
    
    function removeOwner(address _owner) public {
        require(msg.sender == address(this), "Only wallet can remove owner");
        require(isOwner[_owner], "Not an owner");
        require(owners.length - 1 >= numConfirmationsRequired, "Too few owners left");
        
        isOwner[_owner] = false;
        
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        emit OwnerRemoval(_owner);
    }
    
    function changeRequirement(uint _required) public {
        require(msg.sender == address(this), "Only wallet can change requirement");
        require(_required > 0 && _required <= owners.length, "Invalid required number");
        
        numConfirmationsRequired = _required;
        
        emit RequirementChange(_required);
    }
}`;
};

// Generate custom contract
const generateCustomContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  let imports = [];
  let inheritance = [];
  
  if (features.includes("ownable")) {
    imports.push(`import "@openzeppelin/contracts/access/Ownable.sol";`);
    inheritance.push("Ownable");
  }
  
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts/security/Pausable.sol";`);
    inheritance.push("Pausable");
  }
  
  const importsText = imports.length > 0 ? imports.join("\n") + "\n\n" : "";
  const inherits = inheritance.length > 0 ? ` is ${inheritance.join(", ")}` : "";
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${importsText}/**
 * @title ${contractName}
 * @dev Custom Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName}${inherits} {
    uint256 public value;
    address public creator;
    
    event ValueChanged(address indexed changer, uint256 newValue);
    
    constructor() {
        creator = msg.sender;
    }
    
    function setValue(uint256 newValue) public ${features.includes("ownable") ? "onlyOwner" : ""} {
        value = newValue;
        emit ValueChanged(msg.sender, newValue);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
    
    ${features.includes("pausable") ? `
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }` : ``}
}`;
};
