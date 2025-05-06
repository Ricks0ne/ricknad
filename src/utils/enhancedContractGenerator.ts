
import { ContractType, SmartContract } from "@/types/blockchain";

// Contract context to remember previous interactions and settings
interface ContractContext {
  previousContracts: SmartContract[];
  currentContract: SmartContract | null;
  parameters: Record<string, any>;
  userIntent: string[];
}

// Initialize empty context
const contractContext: ContractContext = {
  previousContracts: [],
  currentContract: null,
  parameters: {},
  userIntent: []
};

// Contract templates with OpenZeppelin integration
const contractTemplates = {
  erc20: (name: string, symbol: string, cap: string = "0", mintable: boolean = true): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ${name} Token
 * @dev Implementation of the ${name} Token
 * @custom:security-contact security@${name.toLowerCase()}.com
 */
contract ${name} is ERC20, ERC20Burnable, Ownable {
    using SafeMath for uint256;

    ${cap !== "0" ? `uint256 private _cap = ${cap} * 10 ** decimals();` : ''}
    
    event TokensMinted(address indexed to, uint256 amount);

    constructor() ERC20("${name}", "${symbol}") Ownable(msg.sender) {
        // Initial supply can be minted to the deployer if desired
    }
    
    ${mintable ? `
    /**
     * @dev Creates new tokens and assigns them to the specified address.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        ${cap !== "0" ? 
        `require(ERC20.totalSupply() + amount <= _cap, "ERC20Capped: cap exceeded");` 
        : ''}
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    ` : ''}
    
    ${cap !== "0" ? `
    /**
     * @dev Returns the cap on the token's total supply.
     */
    function cap() public view returns (uint256) {
        return _cap;
    }
    ` : ''}

    /**
     * @dev Hook that is called before any transfer of tokens.
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param amount uint256 the amount of tokens to be transferred
     */
    function _update(address from, address to, uint256 amount)
        internal
        override
    {
        super._update(from, to, amount);
    }
}`,

  erc20Upgradeable: (name: string, symbol: string): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ${name} Token (Upgradeable)
 * @dev Implementation of the ${name} Token with UUPS upgradeability pattern
 * @custom:security-contact security@${name.toLowerCase()}.com
 */
contract ${name} is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with token name and symbol
     */
    function initialize() initializer public {
        __ERC20_init("${name}", "${symbol}");
        __ERC20Burnable_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    /**
     * @dev Creates new tokens and assigns them to the specified address.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Function that should revert when \`msg.sender\` is not authorized to upgrade the contract.
     * Called by {upgradeTo} and {upgradeToAndCall}.
     */
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}
}`,

  erc721: (name: string, symbol: string): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ${name} NFT Collection
 * @dev Implementation of the ${name} NFT with on-chain metadata
 * @custom:security-contact security@${name.toLowerCase()}.com
 */
contract ${name} is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;
    
    uint256 private _nextTokenId = 1;
    uint256 public mintPrice = 0.01 ether;
    uint256 public maxSupply = 10000;
    bool public saleIsActive = false;
    
    string public baseURI;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId);
    event SaleStateChanged(bool newState);
    event BaseURIChanged(string newBaseURI);

    constructor() ERC721("${name}", "${symbol}") Ownable(msg.sender) {}

    /**
     * @dev Mints a new token to the specified address
     * @param to The address that will receive the minted token
     */
    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
    }
    
    /**
     * @dev Public mint function that requires payment
     * @param to The address that will receive the minted token
     */
    function publicMint(address to) public payable {
        require(saleIsActive, "Sale must be active to mint");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_nextTokenId <= maxSupply, "Max supply reached");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
    }
    
    /**
     * @dev Sets the base URI for computing {tokenURI}.
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }
    
    /**
     * @dev Toggles the sale state
     * @param newState The new sale state
     */
    function setSaleState(bool newState) public onlyOwner {
        saleIsActive = newState;
        emit SaleStateChanged(newState);
    }
    
    /**
     * @dev Sets the mint price
     * @param newPrice The new mint price
     */
    function setMintPrice(uint256 newPrice) public onlyOwner {
        mintPrice = newPrice;
    }
    
    /**
     * @dev Withdraws the contract balance to the owner
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Base URI for computing {tokenURI}.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`,

  staking: (tokenAddress: string = "", stakingPeriodDays: number = 30, rewardRate: number = 10): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Staking Contract
 * @dev Allows users to stake tokens and earn rewards
 * @custom:security-contact security@staking.com
 */
contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Staking token (e.g., LP token or any ERC20)
    IERC20 public stakingToken;
    
    // Reward token (could be the same as staking token)
    IERC20 public rewardToken;
    
    // Reward rate (percentage with 2 decimals, e.g., 500 = 5%)
    uint256 public rewardRate = ${rewardRate * 100}; // ${rewardRate}%
    
    // Staking period in seconds
    uint256 public stakingPeriodSeconds = ${stakingPeriodDays} days;
    
    // Info for each user
    struct UserInfo {
        uint256 amount;           // How many tokens the user has staked
        uint256 stakingStartTime;  // When the user started staking
        uint256 lastRewardClaim;   // Last time user claimed rewards
        bool isStaking;           // Is the user currently staking
    }

    // User info mapping
    mapping(address => UserInfo) public userInfo;
    
    // Total staked amount
    uint256 public totalStaked;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address _stakingToken${tokenAddress ? '' : ', address _rewardToken'}) Ownable(msg.sender) {
        stakingToken = IERC20(${tokenAddress ? tokenAddress : '_stakingToken'});
        rewardToken = IERC20(${tokenAddress ? tokenAddress : '_rewardToken'});
    }

    /**
     * @dev Stakes tokens in the contract
     * @param amount The amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        
        UserInfo storage user = userInfo[msg.sender];
        
        // Update user staking info
        user.amount += amount;
        user.stakingStartTime = block.timestamp;
        user.lastRewardClaim = block.timestamp;
        user.isStaking = true;
        
        // Update total staked
        totalStaked += amount;
        
        // Transfer tokens to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Withdraws staked tokens and rewards
     */
    function withdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        
        require(user.isStaking, "No active stake");
        require(block.timestamp >= user.stakingStartTime + stakingPeriodSeconds, "Staking period not complete");
        
        uint256 amount = user.amount;
        require(amount > 0, "No tokens to withdraw");
        
        // Calculate rewards
        uint256 rewards = calculateRewards(msg.sender);
        
        // Reset user staking info
        user.amount = 0;
        user.stakingStartTime = 0;
        user.lastRewardClaim = 0;
        user.isStaking = false;
        
        // Update total staked
        totalStaked -= amount;
        
        // Transfer staked tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);
        
        // Transfer rewards if available
        if (rewards > 0) {
            rewardToken.safeTransfer(msg.sender, rewards);
            emit RewardClaimed(msg.sender, rewards);
        }
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Claims rewards without withdrawing staked tokens
     */
    function claimRewards() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        
        require(user.isStaking, "No active stake");
        
        // Calculate rewards
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        // Update last claim time
        user.lastRewardClaim = block.timestamp;
        
        // Transfer rewards
        rewardToken.safeTransfer(msg.sender, rewards);
        
        emit RewardClaimed(msg.sender, rewards);
    }

    /**
     * @dev Calculates pending rewards for a user
     * @param account The user address
     * @return The amount of reward tokens earned
     */
    function calculateRewards(address account) public view returns (uint256) {
        UserInfo storage user = userInfo[account];
        
        if (!user.isStaking || user.amount == 0) {
            return 0;
        }
        
        // Calculate staking duration
        uint256 stakingDuration = block.timestamp - user.lastRewardClaim;
        
        // Calculate rewards based on staking amount, duration and reward rate
        uint256 rewards = (user.amount * stakingDuration * rewardRate) / (365 days * 10000);
        
        return rewards;
    }

    /**
     * @dev Sets the reward rate
     * @param newRewardRate The new reward rate (percentage with 2 decimals)
     */
    function setRewardRate(uint256 newRewardRate) external onlyOwner {
        rewardRate = newRewardRate;
    }

    /**
     * @dev Sets the staking period
     * @param newStakingPeriodDays The new staking period in days
     */
    function setStakingPeriod(uint256 newStakingPeriodDays) external onlyOwner {
        stakingPeriodSeconds = newStakingPeriodDays * 1 days;
    }

    /**
     * @dev Emergency withdraw function to rescue tokens
     * @param token The token address to rescue
     */
    function rescueTokens(address token) external onlyOwner {
        IERC20 tokenToRescue = IERC20(token);
        uint256 balance = tokenToRescue.balanceOf(address(this));
        tokenToRescue.safeTransfer(owner(), balance);
    }
}`,

  dao: (tokenAddress: string = "", quorum: number = 50, votingPeriod: number = 7): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

/**
 * @title DAO Governance Contract
 * @dev Governance contract that uses ERC20 token for voting
 * @custom:security-contact security@dao.com
 */
contract DAOGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    constructor(IVotes _token)
        Governor("DAO Governor")
        GovernorSettings(${votingPeriod * 24 * 60 * 60 /* convert days to seconds */}, ${votingPeriod * 24 * 60 * 60 + (2 * 24 * 60 * 60)}, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(${quorum})
    {}

    /**
     * @dev Returns the voting delay in blocks
     */
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    /**
     * @dev Returns the voting period in blocks
     */
    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    /**
     * @dev Returns the quorum required for a proposal to pass
     */
    function quorum(uint256 blockNumber) public view override(IGovernor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    /**
     * @dev Returns the state of a proposal
     */
    function state(uint256 proposalId) public view override(Governor) returns (ProposalState) {
        return super.state(proposalId);
    }

    /**
     * @dev Creates a new proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    /**
     * @dev The required percentage of the total token supply that must vote in order for a proposal to pass
     */
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @dev Executes a proposal
     */
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Cancels a proposal
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }
}`,

  timelock: (minDelay: number = 2): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Governance Timelock
 * @dev Timelock contract for governance proposals
 * @custom:security-contact security@dao.com
 */
contract GovernanceTimelock is TimelockController {
    /**
     * @dev Constructor for Timelock controller
     * @param minDelay The minimum delay before execution
     * @param proposers Array of addresses that can propose
     * @param executors Array of addresses that can execute
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(
        minDelay,
        proposers,
        executors,
        msg.sender
    ) {}
}`,

  vesting: (tokenAddress: string = "", vestingDurationMonths: number = 12, cliffMonths: number = 3): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Token Vesting Contract
 * @dev Contract for token vesting with cliff period
 * @custom:security-contact security@vesting.com
 */
contract TokenVesting is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The token being vested
    IERC20 public immutable token;

    // Vesting schedule for each beneficiary
    struct VestingSchedule {
        uint256 totalAmount;       // Total amount of tokens to be vested
        uint256 startTime;         // When vesting starts
        uint256 cliffDuration;     // Cliff period in seconds
        uint256 vestingDuration;   // Full vesting duration in seconds
        uint256 releasedAmount;    // Amount of tokens released so far
        bool revocable;            // Whether vesting can be revoked
        bool revoked;              // Whether vesting has been revoked
    }

    // Mapping of beneficiary address to vesting schedules
    mapping(address => VestingSchedule) public vestingSchedules;

    // Events
    event VestingScheduleCreated(
        address indexed beneficiary, 
        uint256 amount, 
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);

    /**
     * @dev Creates a new TokenVesting contract
     * @param _token Address of the token being vested
     */
    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Token cannot be zero address");
        token = IERC20(_token);
    }

    /**
     * @dev Creates a vesting schedule for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @param amount Total amount of tokens to be vested
     * @param cliffDurationInMonths Duration of cliff in months
     * @param vestingDurationInMonths Total vesting duration in months
     * @param revocable Whether the vesting is revocable
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDurationInMonths,
        uint256 vestingDurationInMonths,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Beneficiary cannot be zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(vestingDurationInMonths > 0, "Vesting duration must be greater than zero");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting schedule already exists");
        
        uint256 cliffDuration = cliffDurationInMonths * 30 days;
        uint256 vestingDuration = vestingDurationInMonths * 30 days;
        
        require(cliffDuration <= vestingDuration, "Cliff duration cannot exceed vesting duration");

        // Transfer tokens to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Create vesting schedule
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: block.timestamp,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            releasedAmount: 0,
            revocable: revocable,
            revoked: false
        });
        
        emit VestingScheduleCreated(
            beneficiary,
            amount,
            block.timestamp,
            cliffDuration,
            vestingDuration
        );
    }

    /**
     * @dev Releases vested tokens to the beneficiary
     */
    function release() external {
        address beneficiary = msg.sender;
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Vesting has been revoked");
        
        uint256 releasableAmount = _calculateReleasableAmount(schedule);
        require(releasableAmount > 0, "No tokens are due for release");
        
        schedule.releasedAmount = schedule.releasedAmount.add(releasableAmount);
        
        token.safeTransfer(beneficiary, releasableAmount);
        
        emit TokensReleased(beneficiary, releasableAmount);
    }

    /**
     * @dev Revokes vesting for a beneficiary
     * @param beneficiary Address of the beneficiary
     */
    function revoke(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(schedule.revocable, "Vesting is not revocable");
        require(!schedule.revoked, "Vesting already revoked");
        
        uint256 releasableAmount = _calculateReleasableAmount(schedule);
        
        // Update released amount with what's currently releasable
        if (releasableAmount > 0) {
            schedule.releasedAmount = schedule.releasedAmount.add(releasableAmount);
            token.safeTransfer(beneficiary, releasableAmount);
            emit TokensReleased(beneficiary, releasableAmount);
        }
        
        // Calculate unreleased amount and return to owner
        uint256 unreleased = schedule.totalAmount.sub(schedule.releasedAmount);
        if (unreleased > 0) {
            token.safeTransfer(owner(), unreleased);
        }
        
        schedule.revoked = true;
        
        emit VestingRevoked(beneficiary);
    }

    /**
     * @dev Calculates the amount of tokens that have vested but not yet released
     * @param beneficiary Address of the beneficiary
     * @return Amount of releasable tokens
     */
    function releasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.revoked) {
            return 0;
        }
        return _calculateReleasableAmount(schedule);
    }

    /**
     * @dev Calculates vested token amount based on vesting schedule
     * @param schedule The vesting schedule
     * @return The releasable amount
     */
    function _calculateReleasableAmount(VestingSchedule memory schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime.add(schedule.cliffDuration)) {
            return 0;
        }
        
        uint256 timeFromStart = block.timestamp.sub(schedule.startTime);
        
        if (timeFromStart >= schedule.vestingDuration) {
            // Fully vested
            return schedule.totalAmount.sub(schedule.releasedAmount);
        } else {
            // Partially vested
            uint256 vestedAmount = schedule.totalAmount.mul(timeFromStart).div(schedule.vestingDuration);
            return vestedAmount.sub(schedule.releasedAmount);
        }
    }
}`,

  multisig: (owners: string[] = ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002"], threshold: number = 2): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Multi-signature Wallet
 * @dev Contract for multi-signature transactions
 * @custom:security-contact security@multisig.com
 */
contract MultiSigWallet {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    event Deposit(address indexed sender, uint amount, uint balance);
    event TransactionCreated(address indexed owner, uint indexed txId, address indexed to, uint value, bytes data);
    event TransactionConfirmed(address indexed owner, uint indexed txId);
    event TransactionRevoked(address indexed owner, uint indexed txId);
    event TransactionExecuted(address indexed owner, uint indexed txId);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint threshold);

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint confirmations;
    }
    
    // Counter for transaction IDs
    Counters.Counter private _txIdCounter;
    
    // Storage for transactions
    mapping(uint => Transaction) public transactions;
    
    // Mapping of transaction ID to owner to confirmation status
    mapping(uint => mapping(address => bool)) public isConfirmed;
    
    // List of owners
    address[] public owners;
    
    // Mapping to check if an address is an owner
    mapping(address => bool) public isOwner;
    
    // Number of confirmations required to execute a transaction
    uint public threshold;
    
    /**
     * @dev Initializes the contract with owners and confirmation threshold
     * @param _owners Array of owner addresses
     * @param _threshold Number of required confirmations
     */
    constructor(address[] memory _owners, uint _threshold) {
        require(_owners.length > 0, "Owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        threshold = _threshold;
    }
    
    /**
     * @dev Fallback function to receive Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    /**
     * @dev Creates a new transaction
     * @param _to Destination address
     * @param _value Amount of Ether to send
     * @param _data Transaction data
     * @return txId The transaction ID
     */
    function submitTransaction(address _to, uint _value, bytes memory _data) public onlyOwner returns (uint) {
        uint txId = _txIdCounter.current();
        _txIdCounter.increment();
        
        transactions[txId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmations: 0
        });
        
        emit TransactionCreated(msg.sender, txId, _to, _value, _data);
        
        return txId;
    }
    
    /**
     * @dev Confirms a transaction
     * @param _txId The transaction ID
     */
    function confirmTransaction(uint _txId) public onlyOwner txExists(_txId) notExecuted(_txId) notConfirmed(_txId) {
        Transaction storage transaction = transactions[_txId];
        transaction.confirmations += 1;
        isConfirmed[_txId][msg.sender] = true;
        
        emit TransactionConfirmed(msg.sender, _txId);
    }
    
    /**
     * @dev Revokes a confirmation
     * @param _txId The transaction ID
     */
    function revokeConfirmation(uint _txId) public onlyOwner txExists(_txId) notExecuted(_txId) confirmed(_txId) {
        Transaction storage transaction = transactions[_txId];
        transaction.confirmations -= 1;
        isConfirmed[_txId][msg.sender] = false;
        
        emit TransactionRevoked(msg.sender, _txId);
    }
    
    /**
     * @dev Executes a confirmed transaction
     * @param _txId The transaction ID
     */
    function executeTransaction(uint _txId) public onlyOwner txExists(_txId) notExecuted(_txId) {
        Transaction storage transaction = transactions[_txId];
        
        require(transaction.confirmations >= threshold, "Not enough confirmations");
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(msg.sender, _txId);
    }
    
    /**
     * @dev Adds a new owner
     * @param _owner Address of new owner
     */
    function addOwner(address _owner) public onlyWallet {
        require(_owner != address(0), "Invalid owner");
        require(!isOwner[_owner], "Already an owner");
        
        isOwner[_owner] = true;
        owners.push(_owner);
        
        emit OwnerAdded(_owner);
    }
    
    /**
     * @dev Removes an existing owner
     * @param _owner Address of owner to remove
     */
    function removeOwner(address _owner) public onlyWallet {
        require(isOwner[_owner], "Not an owner");
        require(owners.length > threshold, "Too few owners left");
        
        isOwner[_owner] = false;
        
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        if (threshold > owners.length) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }
        
        emit OwnerRemoved(_owner);
    }
    
    /**
     * @dev Changes the confirmation threshold
     * @param _threshold New threshold
     */
    function changeThreshold(uint _threshold) public onlyWallet {
        require(_threshold > 0 && _threshold <= owners.length, "Invalid threshold");
        threshold = _threshold;
        
        emit ThresholdChanged(threshold);
    }
    
    /**
     * @dev Returns the list of owners
     */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Returns the count of transactions
     */
    function getTransactionCount() public view returns (uint) {
        return _txIdCounter.current();
    }
    
    /**
     * @dev Returns transaction details
     * @param _txId The transaction ID
     */
    function getTransaction(uint _txId) public view txExists(_txId) returns (
        address to,
        uint value,
        bytes memory data,
        bool executed,
        uint confirmations
    ) {
        Transaction storage transaction = transactions[_txId];
        
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.confirmations
        );
    }
    
    // Modifiers
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier txExists(uint _txId) {
        require(_txId < _txIdCounter.current(), "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint _txId) {
        require(!isConfirmed[_txId][msg.sender], "Transaction already confirmed");
        _;
    }
    
    modifier confirmed(uint _txId) {
        require(isConfirmed[_txId][msg.sender], "Transaction not confirmed");
        _;
    }
    
    modifier onlyWallet() {
        require(msg.sender == address(this), "Only wallet can call");
        _;
    }
}`,

  upgradeable: (name: string): string => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ${name} (Upgradeable Implementation)
 * @dev Implementation contract using UUPS proxy pattern
 * @custom:security-contact security@${name.toLowerCase()}.com
 */
contract ${name}Implementation is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public value;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the contract replacing the constructor
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }
    
    /**
     * @dev Sets a new value
     * @param newValue The new value to store
     */
    function setValue(uint256 newValue) public onlyOwner {
        value = newValue;
    }
    
    /**
     * @dev Gets the current value
     * @return Current stored value
     */
    function getValue() public view returns (uint256) {
        return value;
    }
    
    /**
     * @dev Function that should revert when \`msg.sender\` is not authorized to upgrade the contract.
     * Called by {upgradeTo} and {upgradeToAndCall}.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}`
};

// Helper function to parse common contract parameters from user input
function parseContractParameters(input: string): Record<string, any> {
  const params: Record<string, any> = {};
  
  // Extract token name
  const nameMatch = input.match(/(?:called|named|name[: ]+|token[: ]+|named[: ]+|for ?a ?token ?(?:called|named) )["']?([a-zA-Z0-9 ]+)["']?/i);
  if (nameMatch && nameMatch[1]) {
    params.name = nameMatch[1].trim();
  }

  // Extract token symbol
  const symbolMatch = input.match(/symbol[: ]+["']?([a-zA-Z0-9]{1,10})["']?/i);
  if (symbolMatch && symbolMatch[1]) {
    params.symbol = symbolMatch[1].trim();
  }

  // Extract token supply/cap
  const supplyMatch = input.match(/(?:supply|cap)[: ]+["']?([0-9,.]+)(?:[ ]?million|[ ]?billion)?["']?/i);
  if (supplyMatch && supplyMatch[1]) {
    let supply = parseFloat(supplyMatch[1].replace(/,/g, ''));
    if (input.includes('million')) supply *= 1000000;
    if (input.includes('billion')) supply *= 1000000000;
    params.supply = supply.toString();
  }

  // Extract staking parameters
  if (input.includes('staking') || input.includes('stake')) {
    const periodMatch = input.match(/(?:period|duration|lock)[: ]+["']?([0-9,.]+)[ ]?(days?|weeks?|months?)["']?/i);
    if (periodMatch && periodMatch[1]) {
      let period = parseInt(periodMatch[1].replace(/,/g, ''));
      if (periodMatch[2].startsWith('week')) period *= 7;
      if (periodMatch[2].startsWith('month')) period *= 30;
      params.stakingPeriod = period;
    }

    const rewardMatch = input.match(/(?:reward|apy|apr|interest)[: ]+["']?([0-9,.]+)%?["']?/i);
    if (rewardMatch && rewardMatch[1]) {
      params.rewardRate = parseFloat(rewardMatch[1].replace(/,/g, ''));
    }
  }

  // Extract DAO parameters
  if (input.includes('dao') || input.includes('governance')) {
    const quorumMatch = input.match(/(?:quorum)[: ]+["']?([0-9,.]+)%?["']?/i);
    if (quorumMatch && quorumMatch[1]) {
      params.quorum = parseInt(quorumMatch[1].replace(/,/g, ''));
    }

    const votingPeriodMatch = input.match(/(?:voting ?period|vote ?period)[: ]+["']?([0-9,.]+)[ ]?(days?|weeks?)["']?/i);
    if (votingPeriodMatch && votingPeriodMatch[1]) {
      let period = parseInt(votingPeriodMatch[1].replace(/,/g, ''));
      if (votingPeriodMatch[2].startsWith('week')) period *= 7;
      params.votingPeriod = period;
    }
  }

  return params;
}

// Function to determine the type of contract needed based on user input
function determineContractType(input: string, existingContext: ContractContext): ContractType {
  input = input.toLowerCase();
  
  // Contract type detection based on keywords in prompt
  if (input.includes('erc721') || input.includes('nft') || input.includes('collectible')) {
    return 'erc721';
  } else if (input.includes('erc1155') || input.includes('multi-token')) {
    return 'erc1155';
  } else if (input.includes('erc20') || input.includes('token') || input.includes('coin')) {
    // Check if upgradeable is explicitly mentioned
    if (input.includes('upgrad') || input.includes('proxy')) {
      return 'erc20Upgradeable';
    }
    return 'erc20';
  } else if (input.includes('stake') || input.includes('staking')) {
    return 'staking';
  } else if (input.includes('dao') || input.includes('governance') || input.includes('proposal') || input.includes('vote')) {
    return 'dao';
  } else if (input.includes('timelock')) {
    return 'timelock';
  } else if (input.includes('vest') || input.includes('unlock')) {
    return 'vesting';
  } else if (input.includes('multisig') || input.includes('multi-sig')) {
    return 'multisig';
  } else if ((input.includes('upgrad') || input.includes('proxy')) && !input.includes('erc20')) {
    // Generic upgradeable contract
    return 'upgradeable';
  }
  
  // If we can't determine, use the most recently mentioned contract type
  if (existingContext.currentContract?.type) {
    return existingContext.currentContract.type as ContractType;
  }
  
  // Default to ERC20 if no specific type can be determined
  return 'erc20';
}

// Generate a contract based on the user's request
export function enhancedGenerateContract(userPrompt: string): {
  code: string;
  name: string;
  type: ContractType;
} {
  // Parse parameters
  const params = parseContractParameters(userPrompt);
  
  // Determine the contract type
  const contractType = determineContractType(userPrompt, contractContext);
  
  // If we don't have a name yet, generate one based on the contract type
  if (!params.name) {
    switch (contractType) {
      case 'erc20':
      case 'erc20Upgradeable':
        params.name = 'MonadToken';
        params.symbol = 'MTKN';
        break;
      case 'erc721':
        params.name = 'MonadNFT';
        params.symbol = 'MNFT';
        break;
      case 'erc1155':
        params.name = 'MonadMultiToken';
        params.symbol = 'MMT';
        break;
      case 'staking':
        params.name = 'MonadStaking';
        break;
      case 'dao':
        params.name = 'MonadDAO';
        break;
      case 'timelock':
        params.name = 'MonadTimelock';
        break;
      case 'vesting':
        params.name = 'MonadVesting';
        break;
      case 'multisig':
        params.name = 'MonadMultiSig';
        break;
      case 'upgradeable':
        params.name = 'MonadUpgradeable';
        break;
      default:
        params.name = 'MonadContract';
    }
  }
  
  // If no symbol for token contracts, create one from the name
  if ((contractType.includes('erc20') || contractType.includes('erc721')) && !params.symbol) {
    params.symbol = params.name.replace(/[^A-Z]/gi, '').substring(0, 5).toUpperCase();
  }
  
  // Generate contract code based on the determined type
  let contractCode = '';
  switch (contractType) {
    case 'erc20':
      contractCode = contractTemplates.erc20(params.name, params.symbol || 'TKN', params.supply || '0');
      break;
    case 'erc20Upgradeable':
      contractCode = contractTemplates.erc20Upgradeable(params.name, params.symbol || 'TKN');
      break;
    case 'erc721':
      contractCode = contractTemplates.erc721(params.name, params.symbol || 'NFT');
      break;
    case 'staking':
      contractCode = contractTemplates.staking('', params.stakingPeriod || 30, params.rewardRate || 10);
      break;
    case 'dao':
      contractCode = contractTemplates.dao('', params.quorum || 50, params.votingPeriod || 7);
      break;
    case 'timelock':
      contractCode = contractTemplates.timelock();
      break;
    case 'vesting':
      contractCode = contractTemplates.vesting('');
      break;
    case 'multisig':
      contractCode = contractTemplates.multisig();
      break;
    case 'upgradeable':
      contractCode = contractTemplates.upgradeable(params.name);
      break;
    default:
      contractCode = contractTemplates.erc20(params.name, params.symbol || 'TKN');
  }
  
  // Update the contract context to remember this interaction
  updateContractContext(userPrompt, {
    name: params.name,
    type: contractType,
    code: contractCode
  });
  
  // Return the generated contract
  return {
    code: contractCode,
    name: params.name,
    type: contractType
  };
}

// Function to update the global contract context
function updateContractContext(userPrompt: string, newContract: any) {
  // Add current prompt to the intent history
  contractContext.userIntent.push(userPrompt);
  
  // If there's a current contract, move it to previous contracts
  if (contractContext.currentContract) {
    contractContext.previousContracts.push(contractContext.currentContract);
  }
  
  // Set the new contract as current
  contractContext.currentContract = newContract;
  
  // Update parameters
  contractContext.parameters = { ...contractContext.parameters, ...parseContractParameters(userPrompt) };
  
  // Limit the size of the contract history to prevent excessive memory usage
  if (contractContext.previousContracts.length > 5) {
    contractContext.previousContracts.shift();
  }
  
  // Limit the size of the intent history to prevent excessive memory usage
  if (contractContext.userIntent.length > 10) {
    contractContext.userIntent.shift();
  }
}

export { enhancedGenerateContract as generateContract };
