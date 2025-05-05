
import { ContractTemplate, ContractType, ContractFeature } from "@/types/blockchain";

// Generate contract code based on the user's request
export const generateContract = (prompt: string): { code: string; name: string; type: ContractType } => {
  const promptLC = prompt.toLowerCase();
  const seed = Math.floor(Math.random() * 10000);
  const currentDate = new Date().toISOString();
  
  // Determine contract name
  let contractName = "GeneratedContract";
  let contractType: ContractType = "custom";
  
  if (promptLC.includes("erc20") || promptLC.includes("token") || promptLC.includes("fungible")) {
    contractName = "RickToken";
    contractType = "erc20";
  } else if (promptLC.includes("erc721") || promptLC.includes("nft")) {
    contractName = "RickNFT";
    contractType = "erc721";
  } else if (promptLC.includes("erc1155") || promptLC.includes("multi") && promptLC.includes("token")) {
    contractName = "RickMultiToken";
    contractType = "erc1155";
  } else if (promptLC.includes("staking") || promptLC.includes("stake")) {
    contractName = "RickStaking";
    contractType = "staking";
  } else if (promptLC.includes("governance") || promptLC.includes("dao") || promptLC.includes("voting")) {
    contractName = "RickGovernance";
    contractType = "governance";
  } else if (promptLC.includes("proxy") || promptLC.includes("upgradable") || promptLC.includes("upgradeable")) {
    contractName = "RickUpgradeable";
    contractType = "proxy";
  }
  
  // Extract features from prompt
  const features: ContractFeature[] = [];
  if (promptLC.includes("pausable") || promptLC.includes("pause")) features.push("pausable");
  if (promptLC.includes("ownable") || promptLC.includes("owner") || promptLC.includes("admin")) features.push("ownable");
  if (promptLC.includes("mintable") || promptLC.includes("mint")) features.push("mintable");
  if (promptLC.includes("burnable") || promptLC.includes("burn")) features.push("burnable");
  if (promptLC.includes("cap") || promptLC.includes("supply") && promptLC.includes("limit")) features.push("capped");
  if (promptLC.includes("role") || promptLC.includes("access control") || promptLC.includes("permission")) features.push("roles");
  if (promptLC.includes("time") || promptLC.includes("lock")) features.push("timelock");
  
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
    case "staking":
      code = generateStakingContract(contractName, features, prompt, seed, currentDate);
      break;
    case "governance":
      code = generateGovernanceContract(contractName, features, prompt, seed, currentDate);
      break;
    case "proxy":
      code = generateUpgradeableContract(contractName, features, prompt, seed, currentDate);
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
  
  // Build the contract
  const inherits = inheritance.join(", ");
  const constructorArgs = features.includes("capped") ? 
    `uint256 initialSupply) ERC20("${contractName}", "${contractName.substring(0, 4)}") ERC20Capped(1000000 * 10 ** decimals()` : 
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
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Staking Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inheritance.join(", ")} {
    using SafeERC20 for IERC20;
    
    // Staking token (what users deposit)
    IERC20 public stakingToken;
    
    // Reward token (what users earn)
    IERC20 public rewardToken;
    
    // Reward rate per second
    uint256 public rewardRate;
    
    // Last update time
    uint256 public lastUpdateTime;
    
    // Reward per token stored
    uint256 public rewardPerTokenStored;
    
    // User rewards
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    
    // Total staked
    uint256 public totalSupply;
    
    // User balances
    mapping(address => uint256) public balanceOf;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    
    constructor(address _stakingToken, address _rewardToken, uint256 _rewardRate) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }
    
    // Update reward
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        
        _;
    }
    
    // Calculate reward per token
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + (
            (block.timestamp - lastUpdateTime) * rewardRate * 1e18 / totalSupply
        );
    }
    
    // Calculate earned rewards
    function earned(address account) public view returns (uint256) {
        return (
            balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18
        ) + rewards[account];
    }
    
    // Stake tokens
    function stake(uint256 amount) external ${features.includes("pausable") ? "whenNotPaused " : ""}nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount);
    }
    
    // Withdraw staked tokens
    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balanceOf[msg.sender] >= amount, "Not enough staked");
        
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // Claim rewards
    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }
    ${features.includes("pausable") ? `
    // Pause staking
    function pause() external onlyOwner {
        _pause();
    }
    
    // Unpause staking
    function unpause() external onlyOwner {
        _unpause();
    }` : ""}
    
    // Exit: withdraw all and claim rewards
    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }
    
    ${features.includes("ownable") ? `
    // Update reward rate
    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _rewardRate;
    }` : ""}
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
  let imports = [
    `import "@openzeppelin/contracts/governance/Governor.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";`,
    `import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";`
  ];
  
  if (features.includes("timelock")) {
    imports.push(`import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";`);
  }
  
  const inheritance = [
    "Governor", 
    "GovernorSettings",
    "GovernorCountingSimple",
    "GovernorVotes",
    "GovernorVotesQuorumFraction"
  ];
  
  if (features.includes("timelock")) {
    inheritance.push("GovernorTimelockControl");
  }
  
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
    constructor(IVotes _token${features.includes("timelock") ? ", TimelockController _timelock" : ""})
        Governor("${contractName}")
        GovernorSettings(1 /* 1 block */, 50400 /* 1 week */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        ${features.includes("timelock") ? "GovernorTimelockControl(_timelock)" : ""} {
    }

    // The following functions are overrides required by Solidity.
    
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(IGovernor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(Governor${features.includes("timelock") ? ", GovernorTimelockControl" : ""}) returns (ProposalState) {
        return super.state(proposalId);
    }

    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
        public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal override(Governor${features.includes("timelock") ? ", GovernorTimelockControl" : ""}) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal override(Governor${features.includes("timelock") ? ", GovernorTimelockControl" : ""}) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor${features.includes("timelock") ? ", GovernorTimelockControl" : ""}) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId) public view override(Governor${features.includes("timelock") ? ", GovernorTimelockControl" : ""}) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`;
};

// Generate upgradeable proxy contract
const generateUpgradeableContract = (
  contractName: string, 
  features: ContractFeature[], 
  prompt: string, 
  seed: number, 
  currentDate: string
): string => {
  const imports = [
    `import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";`,
    `import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";`
  ];
  
  if (features.includes("pausable")) {
    imports.push(`import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";`);
  }
  
  const inheritance = ["Initializable", "OwnableUpgradeable"];
  
  if (features.includes("pausable")) {
    inheritance.push("PausableUpgradeable");
  }
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Upgradeable Contract Implementation auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ${inheritance.join(", ")} {
    uint256 private _value;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __Ownable_init();
        ${features.includes("pausable") ? "__Pausable_init();" : ""}
    }
    
    function setValue(uint256 newValue) public ${features.includes("pausable") ? "whenNotPaused " : ""}onlyOwner {
        _value = newValue;
    }
    
    function getValue() public view returns (uint256) {
        return _value;
    }
    ${features.includes("pausable") ? `
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }` : ""}
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
  const words = prompt.split(/\s+/).filter(word => word.length > 3);
  const varName1 = words.length > 0 ? words[0].toLowerCase() : 'data';
  const varName2 = words.length > 1 ? words[1].toLowerCase() : 'value';
  const eventName = words.length > 2 ? 
    words[2].charAt(0).toUpperCase() + words[2].slice(1) + 'Updated' : 
    'DataUpdated';
  
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
  
  const inherits = inheritance.length > 0 ? `is ${inheritance.join(", ")}` : "";
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

${imports.join("\n")}

/**
 * @title ${contractName}
 * @dev Generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} ${inherits} {
    // State variables
    ${features.includes("ownable") ? "" : "address public owner;"}
    uint256 public ${varName1}Count;
    string public ${varName2}Text;
    bool public isActive;
    
    // Events
    event ${eventName}(address indexed user, uint256 ${varName1}Count, string ${varName2}Text);
    ${features.includes("ownable") ? "" : "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);"}
    
    // Constructor
    constructor() ${inheritance.length > 0 ? "" : "{"} 
        ${features.includes("ownable") ? "" : "owner = msg.sender;"}
        ${varName1}Count = ${seed % 100};
        ${varName2}Text = "Initial value from Ricknad Generator #${seed}";
        isActive = true;
    ${inheritance.length > 0 ? "" : "}"}
    
    // Modifiers
    ${features.includes("ownable") ? "" : `modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: owner only");
        _;
    }`}
    
    modifier whenActive() {
        require(isActive, "Contract is not active");
        _;
    }
    
    // Functions
    function update${varName1.charAt(0).toUpperCase() + varName1.slice(1)}(uint256 _value) public ${features.includes("pausable") ? "whenNotPaused " : ""}whenActive {
        ${varName1}Count = _value;
        emit ${eventName}(msg.sender, ${varName1}Count, ${varName2}Text);
    }
    
    function set${varName2.charAt(0).toUpperCase() + varName2.slice(1)}(string memory _text) public onlyOwner whenActive {
        ${varName2}Text = _text;
        emit ${eventName}(msg.sender, ${varName1}Count, ${varName2}Text);
    }
    
    function getContractData() public view returns (address, uint256, string memory, bool) {
        return (${features.includes("ownable") ? "owner()" : "owner"}, ${varName1}Count, ${varName2}Text, isActive);
    }
    
    function toggleActive() public onlyOwner {
        isActive = !isActive;
    }
    ${features.includes("pausable") ? `
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }` : ""}
    
    ${features.includes("ownable") ? "" : `function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }`}
}`;
};
