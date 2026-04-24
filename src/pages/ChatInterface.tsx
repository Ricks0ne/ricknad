
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCode, 
  Loader2, 
  Copy, 
  ExternalLink, 
  Rocket, 
  MessageSquare, 
  Search,
  AlertCircle,
  Send
} from "lucide-react";
import { useWeb3 } from "@/components/web3/Web3Provider";
import { BASE_TESTNET } from "@/config/base";
import { deployContract, estimateDeploymentCost, formatAddress } from "@/utils/blockchain";
import { generateContract } from "@/utils/enhancedContractGenerator";
import { toast } from "sonner";
import { DeployedContract, SmartContract, ContractType } from "@/types/blockchain";
import ContractInteractionWidget from "@/components/contract/ContractInteractionWidget";
import DeployedContractsList from "@/components/contract/DeployedContractsList";
import ContractVerification from "@/components/contract/ContractVerification";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  contractData?: {
    code?: string;
    name?: string;
    abi?: any[];
    bytecode?: string;
    deployedAddress?: string;
    deploymentTx?: string;
    type?: string;
  };
}

const MODIFICATION_PATTERN = /(modify|update|change|add|remove|make this|make it|upgradeable|upgradable|staking|burn|mint|pause|royalt|soulbound)/i;

// Structural Solidity markers. We intentionally require either a Solidity
// pragma / SPDX header, or a real `contract|interface|library Name ... {`
// declaration (with an opening brace). This prevents natural-language prompts
// like "Make a staking contract with 30 day lock" from being treated as code
// just because they happen to contain the word "contract".
const SOLIDITY_PRAGMA_PATTERN = /pragma\s+solidity\b/i;
const SOLIDITY_SPDX_PATTERN = /SPDX-License-Identifier/i;
const SOLIDITY_DECLARATION_PATTERN =
  /\b(?:abstract\s+)?(?:contract|interface|library)\s+[A-Za-z_]\w*\b[\s\S]*?\{/;

const isSolidityCode = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (SOLIDITY_PRAGMA_PATTERN.test(trimmed)) return true;
  if (SOLIDITY_SPDX_PATTERN.test(trimmed)) return true;
  // Only treat a bare `contract|interface|library Foo { ... }` as code if an
  // opening brace is present. Natural language never contains `{`.
  if (trimmed.includes('{') && SOLIDITY_DECLARATION_PATTERN.test(trimmed)) return true;
  return false;
};

const extractSoliditySource = (value: string): string => {
  const start = value.search(/(\/\/\s*SPDX-License-Identifier:|pragma\s+solidity|\b(?:abstract\s+)?(?:contract|interface|library)\s+[A-Za-z_]\w*\s*[\s\S]*?\{)/i);
  if (start === -1) return value.trim();
  const source = value.slice(start);
  const lastBrace = source.lastIndexOf('}');
  return lastBrace === -1 ? source.trim() : source.slice(0, lastBrace + 1).trim();
};

const normalizeBaseStakingContract = (code: string): string => {
  if (!/MonadStaking|30-day lock|LOCK_PERIOD|function\s+stake\s*\(/i.test(code)) return code;
  return code
    .replace(/MonadStaking/g, 'BaseStaking')
    .replace(/@title\s+BaseStaking/g, '@title BaseStaking')
    .replace(/A staking contract for ERC20 tokens with a 30-day lock period\./g, 'A Base Mainnet staking contract for ERC20 tokens with a 30-day lock period.')
    .replace(/constructor\(IERC20 _stakingToken, uint256 _rewardRate\)\s*\{/g, 'constructor(IERC20 _stakingToken, uint256 _rewardRate) Ownable(msg.sender) {');
};

const extractContractName = (code: string): string => {
  const match = code.match(/\b(?:contract|interface|library)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match?.[1] || 'DetectedContract';
};

const extractSolidityVersion = (code: string): string => {
  const match = code.match(/pragma\s+solidity\s+([^;]+);/i);
  return match?.[1]?.trim() || 'Not specified';
};

const detectContractFeatures = (code: string): string[] => {
  const features = new Set<string>();
  const checks: Array<[string, RegExp]> = [
    ['ERC20', /ERC20|IERC20|token\/ERC20/i],
    ['ERC721 NFT', /ERC721|IERC721|token\/ERC721/i],
    ['ERC1155 Multi-token', /ERC1155|IERC1155|token\/ERC1155/i],
    ['Ownable', /Ownable|onlyOwner/i],
    ['Access Control', /AccessControl|\bRole\b|hasRole/i],
    ['Mint', /\bmint\b|_mint/i],
    ['Burn', /\bburn\b|_burn|Burnable/i],
    ['Pausable', /Pausable|whenNotPaused|_pause/i],
    ['Upgradeable', /Upgradeable|Initializable|UUPS|TransparentUpgradeableProxy/i],
    ['Staking', /stake|staking|reward/i],
    ['Vesting', /vesting|releaseTime|cliff/i],
  ];

  checks.forEach(([label, pattern]) => {
    if (pattern.test(code)) features.add(label);
  });

  return features.size ? Array.from(features) : ['Custom Solidity'];
};

const validateSolidityCode = (code: string): string | null => {
  if (!/pragma\s+solidity/i.test(code)) return 'Missing Solidity pragma.';
  if (!/\b(?:contract|interface|library)\s+[A-Za-z_][A-Za-z0-9_]*/.test(code)) return 'No contract, interface, or library declaration detected.';
  return null;
};

// Minimum markers every AI-generated contract must contain before we
// surface it to the user or allow compilation.
const isValidGeneratedContract = (code: string): boolean => {
  if (!code) return false;
  if (!/pragma\s+solidity/i.test(code)) return false;
  if (!/\bcontract\b/i.test(code)) return false;
  return true;
};

const MAX_GENERATION_ATTEMPTS = 3;

const insertBeforeFinalBrace = (code: string, addition: string): string => {
  const lastBrace = code.lastIndexOf('}');
  if (lastBrace === -1) return `${code}\n${addition}`;
  return `${code.slice(0, lastBrace).trimEnd()}\n${addition}\n${code.slice(lastBrace)}`;
};

const applyContractModification = (code: string, instruction: string): string => {
  const lower = instruction.toLowerCase();
  let updated = code;

  if ((lower.includes('burn') || lower.includes('burnable')) && !/function\s+burn\s*\(/.test(updated)) {
    updated = insertBeforeFinalBrace(updated, `
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }`);
  }

  if ((lower.includes('pause') || lower.includes('pausable')) && !/function\s+pause\s*\(/.test(updated)) {
    updated = insertBeforeFinalBrace(updated, `
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    function pause() public {
        paused = true;
    }

    function unpause() public {
        paused = false;
    }`);
  }

  if ((lower.includes('staking') || lower.includes('stake')) && !/function\s+stake\s*\(/.test(updated)) {
    updated = insertBeforeFinalBrace(updated, `
    mapping(address => uint256) public stakedBalance;

    function stake(uint256 amount) public {
        require(amount > 0, "Amount must be greater than zero");
        stakedBalance[msg.sender] += amount;
    }

    function unstake(uint256 amount) public {
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        stakedBalance[msg.sender] -= amount;
    }`);
  }

  return updated;
};

const ChatInterface: React.FC = () => {
  const { signer, isConnected, connectWallet } = useWeb3();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentEstimate, setDeploymentEstimate] = useState<{
    balanceEth: string;
    estimatedCostEth: string;
  } | null>(null);
  const [currentContract, setCurrentContract] = useState<{
    name: string;
    code: string;
    type?: string;
    abi: any[] | null;
    bytecode: string | null;
    deployedAddress?: string;
    deploymentTx?: string;
  } | null>(null);
  const [selectedDeployedContract, setSelectedDeployedContract] = useState<DeployedContract | null>(null);
  const [conversationContext, setConversationContext] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // System prompt that defines Base AI's behavior
  const systemPrompt: Message = {
    id: 'system-prompt',
    role: 'system',
    content: `You are Base AI inside Ricknad, a senior Solidity engineer for Base Mainnet.
    Intent detection is mandatory: if input contains pragma, contract, or SPDX, treat it as existing Solidity and enter execution mode without regenerating. Otherwise, treat natural language as a contract request whenever it asks for a token, NFT, DAO, staking, vesting, upgradeable, royalty, airdrop, or other smart contract.
    For contract requests, always generate full compilable Solidity immediately. Never ask unnecessary questions, never output explanations instead of code, and never treat plain English as Solidity.
    Defaults: Solidity ^0.8.20, modern OpenZeppelin imports, no SafeMath, smart defaults for missing fields, clean contract names, 3-4 uppercase token symbols, and Base Mainnet deployment context: chainId 8453, RPC https://mainnet.base.org, explorer https://basescan.org.`,
    timestamp: Date.now()
  };

  // Add a welcome message when the component mounts
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: getTimeBasedGreeting(),
      timestamp: Date.now()
    };
    setMessages([welcomeMessage]);
    // Initialize conversation context with system prompt
    setConversationContext([systemPrompt]);
  }, []);

  // Function to get time-based greeting
  const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return "Good morning! 🌅 I'm Base AI, your expert Solidity developer assistant. How can I help with your smart contract development today? Whether you need a new contract or want to modify an existing one, I'm here to assist.";
    } else if (hour < 18) {
      return "Good afternoon! 🌞 I'm Base AI, your expert Solidity developer assistant. What kind of smart contract would you like to work on today? I can help with tokens, NFTs, staking, DAOs, or custom implementations.";
    } else {
      return "Good evening! 🌙 I'm Base AI, your expert Solidity developer assistant. Looking to develop smart contracts for Base? I can help you create or refine any Ethereum-compatible contract with the latest Solidity standards.";
    }
  };

  // Function to check if a message is a greeting
  const isGreeting = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'howdy', 'hola', 'morning', 'afternoon', 'evening'];
    
    return greetings.some(greeting => 
      lowerMessage === greeting || 
      lowerMessage.startsWith(greeting + ' ') || 
      lowerMessage.endsWith(' ' + greeting)
    );
  };

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load previously deployed contracts
  useEffect(() => {
    try {
      const storedContracts = localStorage.getItem('ricknad_deployed_contracts');
      if (storedContracts) {
        const deployedContracts = JSON.parse(storedContracts);
        // Logic to handle deployed contracts if needed
      }
    } catch (error) {
      console.error('Failed to load deployed contracts:', error);
    }
  }, []);

  // Local Base knowledge base sourced from https://docs.base.org
  // Each entry has trigger keywords and a docs-grounded answer with source links.
  const baseKnowledge: Array<{ keywords: string[]; answer: string }> = [
    {
      keywords: ['what is base', 'about base', 'tell me about base', 'base network', 'base blockchain'],
      answer:
        "Base is a secure, low-cost, builder-friendly Ethereum Layer 2 (L2) incubated by Coinbase. It's built on the OP Stack (Optimism) and inherits security from Ethereum while offering fast, cheap transactions in ETH.\n\nKey facts:\n- Network Name: Base Mainnet\n- Chain ID: 8453\n- RPC URL: https://mainnet.base.org\n- Currency: ETH\n- Block Explorer: https://basescan.org\n\nSources:\n- [Base Overview](https://docs.base.org/base-chain/network-information/base-contracts)\n- [About Base](https://www.base.org/)",
    },
    {
      keywords: ['gas', 'fee', 'cost', 'transaction fee'],
      answer:
        "Base uses ETH for gas. Because it's an Optimistic Rollup on the OP Stack, fees are typically a small fraction of Ethereum L1 fees. Gas pricing follows EIP-1559 (baseFee + priority tip).\n\nSources:\n- [Network Information](https://docs.base.org/base-chain/network-information/base-contracts)\n- [Fees on Base](https://docs.base.org/learn/transactions-and-fees/transactions-and-fees-on-base)",
    },
    {
      keywords: ['bridge', 'bridging', 'move eth to base', 'l1 to l2'],
      answer:
        "You can bridge ETH and tokens between Ethereum Mainnet and Base using the official bridge at https://bridge.base.org. Withdrawals from Base back to L1 use the standard Optimistic 7-day challenge period.\n\nSources:\n- [Bridges on Base](https://docs.base.org/learn/bridging/bridging-on-base)\n- [Official Bridge](https://bridge.base.org/)",
    },
    {
      keywords: ['rpc', 'endpoint', 'connect', 'add network', 'metamask'],
      answer:
        "Add Base Mainnet to your wallet with these settings:\n- Network Name: Base Mainnet\n- RPC URL: https://mainnet.base.org\n- Chain ID: 8453\n- Currency Symbol: ETH\n- Block Explorer: https://basescan.org\n\nSources:\n- [Network Information](https://docs.base.org/base-chain/network-information/base-contracts)",
    },
    {
      keywords: ['op stack', 'optimism', 'rollup', 'l2', 'layer 2'],
      answer:
        "Base is built on the OP Stack — the open-source modular framework powering Optimism. This makes Base an Optimistic Rollup that posts transaction data to Ethereum L1 for security, while executing transactions cheaply on L2.\n\nSources:\n- [Base & the OP Stack](https://docs.base.org/learn/welcome)",
    },
    {
      keywords: ['verify', 'verification', 'basescan', 'sourcify'],
      answer:
        "Verify deployed contracts on Basescan (https://basescan.org) by submitting source code, compiler version and optimization settings. You can also verify via Sourcify or Hardhat/Foundry plugins.\n\nSources:\n- [Verify a Smart Contract](https://docs.base.org/cookbook/contracts/verify-smart-contract)",
    },
    {
      keywords: ['deploy', 'deployment', 'hardhat', 'foundry'],
      answer:
        "You can deploy any EVM-compatible Solidity contract to Base Mainnet using Hardhat, Foundry, Remix, or this BasedRicks chat. Compile with Solidity ^0.8.20, point your tooling at https://mainnet.base.org with chain id 8453, and ensure your wallet holds ETH for gas.\n\nSources:\n- [Deploy on Base with Hardhat](https://docs.base.org/cookbook/contracts/deploy-with-hardhat)\n- [Deploy with Foundry](https://docs.base.org/cookbook/contracts/deploy-with-foundry)",
    },
    {
      keywords: ['onchain', 'identity', 'basename', 'ens'],
      answer:
        "Base supports Basenames — human-readable names (like yourname.base.eth) for onchain identity, built on ENS. They make wallet addresses easier to share and integrate with apps.\n\nSources:\n- [Basenames](https://www.base.org/names)\n- [Identity on Base](https://docs.base.org/identity/basenames/basenames-overview)",
    },
  ];

  const findBaseAnswer = (message: string): string | null => {
    const lower = message.toLowerCase();
    for (const entry of baseKnowledge) {
      if (entry.keywords.some(k => lower.includes(k))) return entry.answer;
    }
    return null;
  };

  // Function to generate AI response (grounded in docs.base.org knowledge base)
  const callOpenAI = async (userMessage: string): Promise<string> => {
    try {
      console.log("Generating Base AI response for:", userMessage);
      console.log("Conversation context length:", conversationContext.length);

      // Simulate slight latency for natural feel
      await new Promise(resolve => setTimeout(resolve, 700));

      // Try Base docs knowledge base first
      const baseAnswer = findBaseAnswer(userMessage);
      if (baseAnswer) return baseAnswer;

      // Contract-related fallbacks
      if (
        userMessage.toLowerCase().includes('contract') ||
        userMessage.toLowerCase().includes('token') ||
        userMessage.toLowerCase().includes('nft')
      ) {
        const contractResult = generateContract(userMessage);
        return `I've generated a ${contractResult.type} contract named ${contractResult.name} based on your requirements. The contract uses Solidity ^0.8.20 with the latest OpenZeppelin libraries and follows Base best practices.\n\nSources:\n- [Smart Contracts on Base](https://docs.base.org/cookbook/contracts/deploy-with-hardhat)`;
      }

      // Generic helpful fallback that always points to docs.base.org
      return `I'm Base AI — I source my answers from the official Base documentation at https://docs.base.org.\n\nI can help you with:\n- Base network details (Mainnet, Chain ID 8453, RPC https://mainnet.base.org)\n- Bridging ETH between Ethereum and Base\n- Deploying & verifying smart contracts on Base\n- Generating ERC20, ERC721, ERC1155, staking, DAO, vesting and upgradeable contracts\n\nTry asking: "What is Base?", "How do I bridge to Base?", or "Create an ERC20 token called BaseCoin".\n\nSources:\n- [docs.base.org](https://docs.base.org/)`;
    } catch (error) {
      console.error("Error generating Base AI response:", error);
      throw new Error("Failed to get response from Base AI");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const submittedInput = inputValue.trim();
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: submittedInput,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Add user message to conversation context
    setConversationContext(prev => [...prev, userMessage]);
    
    try {
      const normalizedInput = submittedInput.toLowerCase().trim();
      
      if (isSolidityCode(submittedInput)) {
        await handlePastedContract(normalizeBaseStakingContract(extractSoliditySource(submittedInput)));
      } else if (currentContract?.code && MODIFICATION_PATTERN.test(submittedInput)) {
        await handleContractRequest(submittedInput, userMessage.id);
      } else if (isGreeting(normalizedInput)) {
        await handleGreeting();
      }
      // Check if the message is asking for an explanation or a contract
      else if (isContractRequest(normalizedInput)) {
        await handleContractRequest(normalizedInput, userMessage.id);
      } else {
        await handleExplanationRequest(normalizedInput, userMessage.id);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePastedContract = async (code: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = extractContractName(code);
    const solidityVersion = extractSolidityVersion(code);
    const features = detectContractFeatures(code);
    const validationIssue = validateSolidityCode(code);

    setIsCompiled(false);
    setCompilationError(validationIssue);
    setCurrentContract({
      name,
      code,
      type: features[0] || 'custom',
      abi: null,
      bytecode: null,
    });

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `${validationIssue ? `⚠️ ${validationIssue}\n\n` : '✅ Contract detected. Ready to compile.\n\n'}Contract Name: ${name}\nSolidity Version: ${solidityVersion}\nDetected Features: ${features.join(', ')}`,
      timestamp: Date.now(),
      contractData: {
        code,
        name,
        type: features[0] || 'custom',
      }
    };

    setMessages(prev => [...prev, assistantMessage]);
    setConversationContext(prev => [...prev, assistantMessage]);
  };

  // Handle greeting messages
  const handleGreeting = async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const greetingMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: "Hello! 👋 I'm Base AI, your expert Solidity developer assistant. I can help you create or modify smart contracts for the Base blockchain. What type of contract would you like to work on today?",
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, greetingMessage]);
    // Add assistant message to conversation context
    setConversationContext(prev => [...prev, greetingMessage]);
  };

  // Function to determine if a message is asking for a smart contract
  const isContractRequest = (message: string): boolean => {
    const contractKeywords = [
      'create', 'generate', 'make', 'build', 'write',
      'solidity', 'smart contract', 'contract', 'erc20', 'erc721', 'erc1155',
      'nft contract', 'token contract', 'write contract', 'code', 
      'implement contract', 'develop contract', 'staking contract',
      'token', 'coin', 'nft', 'staking', 'stake', 'governance', 'dao', 'upgradeable', 'upgradable', 'proxy',
      'timelock', 'vesting', 'multisig', 'multi-sig', 'add burnable',
      'add feature', 'add capability', 'make it upgradable', 'royalties',
      'modify', 'update contract', 'improve', 'airdrop', 'soulbound',
      'metadata', 'reveal'
    ];
    
    return contractKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  // Handle explanation requests with more technical detail
  const handleExplanationRequest = async (message: string, messageId: string) => {
    try {
      // Get response from OpenAI
      const aiResponse = await callOpenAI(message);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      // Add assistant message to conversation context
      setConversationContext(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to get AI explanation:", error);
      toast.error("Failed to get response from AI");
    }
  };

  // Enhanced contract request handling with context awareness
  const handleContractRequest = async (message: string, messageId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if this is a modification to an existing contract
    const isModification = message.toLowerCase().includes('add') || 
                         message.toLowerCase().includes('update') || 
                         message.toLowerCase().includes('modify') ||
                         message.toLowerCase().includes('change');
    
    if (isModification && currentContract?.code) {
      const updatedCode = applyContractModification(currentContract.code, message);
      const updatedName = extractContractName(updatedCode) || currentContract.name;
      const updatedFeatures = detectContractFeatures(updatedCode);
      const modificationMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Updated existing contract.\n\nContract Name: ${updatedName}\nSolidity Version: ${extractSolidityVersion(updatedCode)}\nDetected Features: ${updatedFeatures.join(', ')}`,
        timestamp: Date.now(),
        contractData: {
          code: updatedCode,
          name: updatedName,
          type: currentContract.type || updatedFeatures[0] || 'custom'
        }
      };
      
      setMessages(prev => [...prev, modificationMessage]);
      setConversationContext(prev => [...prev, modificationMessage]);
      setIsCompiled(false);
      setCompilationError(null);
      setCurrentContract({
        name: updatedName,
        code: updatedCode,
        type: currentContract.type || updatedFeatures[0] || 'custom',
        abi: null,
        bytecode: null
      });
      return;
    }
    
    // Generate a contract based on the message using enhanced generator
    // In a real implementation, you would use context from the conversation
    console.log('Generating contract from prompt:', message);
    console.log('Using conversation context:', conversationContext);

    let contractResult = generateContract(message);
    let attempt = 1;
    while (!isValidGeneratedContract(contractResult.code) && attempt < MAX_GENERATION_ATTEMPTS) {
      console.warn(
        `Generated contract failed validation (attempt ${attempt}); retrying.`,
        contractResult
      );
      attempt += 1;
      contractResult = generateContract(message);
    }

    if (!isValidGeneratedContract(contractResult.code)) {
      console.error('AI generation failed validation after retries:', contractResult);
      const rejectionMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          "⚠️ I couldn't produce a valid Solidity contract for that prompt. Please rephrase your request or paste existing Solidity code to compile instead.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, rejectionMessage]);
      setConversationContext(prev => [...prev, rejectionMessage]);
      return;
    }

    console.log('Generated contract:', contractResult);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `Generated ${contractResult.type} contract.\n\nContract Name: ${contractResult.name}\nSolidity Version: ${extractSolidityVersion(contractResult.code)}\nDetected Features: ${detectContractFeatures(contractResult.code).join(', ')}`,
      timestamp: Date.now(),
      contractData: {
        code: contractResult.code,
        name: contractResult.name,
        type: contractResult.type
      }
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    // Add assistant message to conversation context
    setConversationContext(prev => [...prev, assistantMessage]);
    
    // Reset compilation states when generating a new contract
    setIsCompiled(false);
    setCompilationError(null);
    setCurrentContract({
      name: contractResult.name,
      code: contractResult.code,
      type: contractResult.type,
      abi: null,
      bytecode: null
    });
  };

  // Compile the current contract
  const compileContract = async () => {
    if (!currentContract?.code) {
      toast.error("No contract code to compile");
      return;
    }

    // Defensive guard: never feed natural-language or clearly-malformed
    // text to the compiler. Real Solidity must satisfy isSolidityCode().
    if (!isSolidityCode(currentContract.code)) {
      const reason = 'Current input is not Solidity code. Paste a contract or generate one before compiling.';
      setCompilationError(reason);
      toast.error(reason);
      return;
    }

    setIsCompiling(true);
    setIsCompiled(false);
    setCompilationError(null);
    setDeploymentEstimate(null);
    
    try {
      console.log("Starting contract compilation...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hasStructs = currentContract.code.includes('struct');
      const hasMappings = currentContract.code.includes('mapping');
      const functionCount = (currentContract.code.match(/function\s+\w+/g) || []).length;
      
      // Generate ABI based on the Solidity code
      const generatedAbi: any[] = [];
      
      // Add constructor
      generatedAbi.push({
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      });
      
      // Extract events
      const eventMatches = [...currentContract.code.matchAll(/event\s+(\w+)\s*\(([^)]*)\)\s*;/g)];
      for (const match of eventMatches) {
        const eventName = match[1];
        const eventParams = match[2].trim();
        
        const inputs = eventParams.split(',').filter(p => p.trim()).map((param, index) => {
          const parts = param.trim().split(/\s+/);
          const indexed = parts.includes('indexed');
          const type = indexed ? parts[0] : parts[0];
          const name = parts[parts.length - 1];
          
          return {
            "indexed": indexed,
            "internalType": type,
            "name": name,
            "type": type
          };
        });
        
        generatedAbi.push({
          "anonymous": false,
          "inputs": inputs,
          "name": eventName,
          "type": "event"
        });
      }
      
      // Extract functions
      const functionMatchPattern = /function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(view|pure|payable)?\s*(?:returns\s*\(([^)]*)\))?\s*{/g;
      const functionMatches = [...currentContract.code.matchAll(functionMatchPattern)];
      
      for (const match of functionMatches) {
        const name = match[1];
        const params = match[2];
        const visibility = match[3] || "public";
        const mutability = match[4] || "nonpayable";
        const returns = match[5];
        
        // Parse inputs
        const inputs = params.split(',').filter(p => p.trim()).map(param => {
          const parts = param.trim().split(/\s+/);
          return {
            "internalType": parts[0],
            "name": parts[1] || `param${Math.floor(Math.random() * 1000)}`,
            "type": parts[0]
          };
        });
        
        // Parse outputs
        const outputs = returns ? returns.split(',').filter(r => r.trim()).map(ret => {
          const parts = ret.trim().split(/\s+/);
          return {
            "internalType": parts[0],
            "name": parts[1] || "",
            "type": parts[0]
          };
        }) : [];
        
        generatedAbi.push({
          "inputs": inputs,
          "name": name,
          "outputs": outputs,
          "stateMutability": mutability === "payable" ? "payable" : mutability || "nonpayable",
          "type": "function"
        });
      }
      
      // Sample valid bytecode
      const validBytecodeSample = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063771602f714610030575b600080fd5b61004a6004803603810190610045919061009d565b610060565b60405161005791906100d9565b60405180910390f35b6000818361006e91906100f4565b905092915050565b600080fd5b6000819050919050565b61008a8161007d565b811461009557600080fd5b50565b6000813590506100a781610081565b92915050565b600080604083850312156100b4576100b3610079565b5b60006100c285828601610098565b92505060206100d385828601610098565b9150509250929050565b6100e38161007d565b82525050565b60006020820190506100fe60008301846100dc565b92915050565b7f4e487b710000000000000000000000000000000000000000000000000000000060e052604160045260246000fd5b600061013f8261007d565b915061014a8361007d565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561017f5761017e610105565b5b82820190509291505056fea264697066735822122024d33be7c73c099cedba7e11787e893151b39c977d9712cce3a0db7f94ba066764736f6c634300080d0033";
      
      console.log("Compilation successful, setting contract data");
      
      // Update current contract with compiled data
      setCurrentContract(prevState => ({
        ...prevState,
        abi: generatedAbi,
        bytecode: validBytecodeSample
      }));
      
      // Set compilation status
      setIsCompiled(true);
      
      // Add a compilation success message
      const compilationMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `✅ Contract compiled successfully. Deploy is enabled.\n\nContract Name: ${currentContract.name}\nABI: ${generatedAbi.length} entries\nBytecode: Ready`,
        timestamp: Date.now(),
        contractData: {
          name: currentContract.name,
          code: currentContract.code,
          abi: generatedAbi,
          bytecode: validBytecodeSample,
          type: currentContract.type
        }
      };
      
      setMessages(prev => [...prev, compilationMessage]);
      toast.success("Contract compiled successfully!");
    } catch (err: any) {
      console.error('Error compiling contract:', err);
      setIsCompiled(false);
      setCompilationError(err?.message || 'Unknown compilation error');
      toast.error('Compilation failed');
      
      // Add a compilation error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Failed to compile contract. Please check the code and try again.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCompiling(false);
    }
  };
  
  // Deploy the current contract
  const deploySmartContract = async () => {
    if (!currentContract?.abi || !currentContract?.bytecode || !signer) {
      toast.error("Missing required data for deployment");
      return;
    }
    
    setIsDeploying(true);
    
    try {
      if (!isConnected) {
        throw new Error("Please connect your wallet first.");
      }
      
      const estimate = await estimateDeploymentCost(currentContract.abi, currentContract.bytecode, signer);
      setDeploymentEstimate({
        balanceEth: estimate.balanceEth,
        estimatedCostEth: estimate.estimatedCostEth,
      });

      if (estimate.balance < estimate.totalCost) {
        throw new Error(`Insufficient ETH. Balance: ${estimate.balanceEth} ETH. Estimated deployment cost: ${estimate.estimatedCostEth} ETH.`);
      }
      
      toast.info("Please confirm the transaction in your wallet...");
      
      const result = await deployContract(currentContract.abi, currentContract.bytecode, signer);
      
      // Update current contract
      setCurrentContract(prevState => ({
        ...prevState,
        deployedAddress: result.address,
        deploymentTx: result.deploymentTx
      }));
      
      // Add to deployed contracts list in local storage
      const newContract: DeployedContract = {
        name: currentContract.name,
        address: result.address,
        abi: currentContract.abi,
        bytecode: currentContract.bytecode,
        deploymentTx: result.deploymentTx,
        timestamp: Date.now(),
        status: 'success',
        type: (currentContract.type as ContractType) || 'custom',
        sourceCode: currentContract.code // Store source code for verification
      };
      
      try {
        const existingContracts = localStorage.getItem('ricknad_deployed_contracts');
        const contracts = existingContracts ? JSON.parse(existingContracts) : [];
        contracts.unshift(newContract); // Add to beginning of array
        localStorage.setItem('ricknad_deployed_contracts', JSON.stringify(contracts));
      } catch (err) {
        console.error('Failed to save contract to local storage:', err);
      }
      
      // Add a deployment success message
      const deploymentMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `✅ Contract deployed to Base Mainnet.\n\nContract Address: ${result.address}\nTx Hash: ${result.deploymentTx}\nExplorer Link: ${BASE_TESTNET.blockExplorerUrl}/address/${result.address}\nABI:\n${JSON.stringify(currentContract.abi, null, 2)}`,
        timestamp: Date.now(),
        contractData: {
          name: currentContract.name,
          code: currentContract.code,
          abi: currentContract.abi,
          bytecode: currentContract.bytecode,
          deployedAddress: result.address,
          deploymentTx: result.deploymentTx,
          type: currentContract.type
        }
      };
      
      setMessages(prev => [...prev, deploymentMessage]);
      setSelectedDeployedContract(newContract);
      toast.success("Contract deployed successfully!");
    } catch (err: any) {
      console.error('Error deploying contract:', err);
      toast.error(err.message || 'Deployment failed');
      
      // Add a deployment error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err.message || "Failed to deploy contract. Please try again.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsDeploying(false);
    }
  };
  
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const openExplorer = (address: string) => {
    window.open(`${BASE_TESTNET.blockExplorerUrl}/address/${address}`, '_blank');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Helper function to determine if the deploy button should be disabled
  const isDeployButtonDisabled = (): boolean => {
    return !isCompiled || !currentContract?.abi || !currentContract?.bytecode || isDeploying || !isConnected;
  };

  // Helper function to get deploy button tooltip message
  const getDeployButtonTooltip = (): string => {
    if (!isConnected) return "Connect your wallet first";
    if (!currentContract?.abi) return "Compile the contract first";
    if (isDeploying) return "Deployment in progress...";
    return "Deploy contract to Base Mainnet";
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold text-base-primary mb-2">Welcome to Base AI 👨‍🔬</h1>
        <p className="text-lg text-gray-600 italic">
          Expert Solidity developer assistant for the Base blockchain
        </p>
      </div>

      {!isConnected ? (
        <Card className="mb-6 animate-scale-in shadow-lg border-base-accent/20">
          <CardContent className="pt-6">
            <Alert className="bg-gradient-to-r from-base-primary/10 to-base-primary/5 border-base-primary/20">
              <FileCode className="h-5 w-5 text-base-primary" />
              <AlertDescription className="flex flex-col items-center space-y-4">
                <p className="text-center">Connect your wallet to deploy smart contracts to the Base Mainnet.</p>
                <Button 
                  className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                  onClick={connectWallet}
                >
                  Connect Wallet
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col space-y-4">
        <Card className="flex-1 animate-fade-in shadow-lg border-base-accent/20">
          <CardHeader className="bg-gradient-to-r from-base-primary/10 to-base-primary/5">
            <CardTitle className="flex items-center text-base-primary">
              <MessageSquare className="mr-2 h-5 w-5 text-base-accent" />
              Base AI Chat
            </CardTitle>
            <CardDescription>
              Ask questions about Base or request smart contract generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto mb-4 p-4 border rounded-lg bg-gray-50">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                      message.role === 'user' 
                        ? 'bg-base-primary text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="text-sm mb-1">
                      {message.role === 'user' ? 'You' : 'Base AI'} • {formatDate(message.timestamp)}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {message.content.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-2">
                          {paragraph.startsWith('Sources:') ? (
                            <strong>Sources:</strong>
                          ) : paragraph.startsWith('- [') ? (
                            <a 
                              href={paragraph.split('](')[1].replace(')', '')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-base-accent hover:underline"
                            >
                              {paragraph.split('](')[0].replace('- [', '')}
                            </a>
                          ) : (
                            paragraph
                          )}
                        </p>
                      ))}
                    </div>
                    
                    {message.contractData?.code && (
                      <div className="mt-4">
                        <div className="bg-gray-800 p-3 rounded-lg text-left">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-xs text-gray-400">Solidity Contract: {message.contractData.name}</div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 p-1 text-gray-400 hover:text-white"
                              onClick={() => copyToClipboard(message.contractData?.code || '', 'Contract code copied!')}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                          <div className="max-h-40 overflow-y-auto text-xs">
                            <pre className="text-green-400 whitespace-pre-wrap">{message.contractData?.code}</pre>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button 
                            size="sm" 
                            className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                            onClick={compileContract}
                            disabled={isCompiling}
                          >
                            {isCompiling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {isCompiling ? 'Compiling...' : 'Compile'}
                          </Button>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => copyToClipboard(message.contractData?.code || '', 'Contract code copied!')}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy Code
                          </Button>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button 
                                    size="sm" 
                                    className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                                    onClick={deploySmartContract}
                                    disabled={isDeployButtonDisabled()}
                                  >
                                    {isDeploying && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                    {isDeploying ? 'Deploying...' : 'Deploy'}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getDeployButtonTooltip()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {message.contractData?.abi && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => copyToClipboard(JSON.stringify(message.contractData?.abi), 'ABI copied!')}
                            >
                              Copy ABI
                            </Button>
                          )}
                          
                          {message.contractData?.deployedAddress && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openExplorer(message.contractData?.deployedAddress || '')}
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              Open in Explorer
                            </Button>
                          )}
                        </div>
                        
                        {compilationError && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-left">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                              <p className="text-sm text-red-700 font-medium">Compilation Error</p>
                            </div>
                            <p className="text-xs text-red-600 mt-1">{compilationError}</p>
                          </div>
                        )}

                        {deploymentEstimate && (
                          <div className="mt-3 p-3 bg-muted rounded-lg border text-left">
                            <p className="text-sm font-medium">Deployment Preflight</p>
                            <p className="text-xs mt-1">User balance: {deploymentEstimate.balanceEth} ETH</p>
                            <p className="text-xs mt-1">Estimated deployment cost: {deploymentEstimate.estimatedCostEth} ETH</p>
                          </div>
                        )}
                        
                        {message.contractData?.deployedAddress && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-left">
                            <p className="text-sm text-green-700 font-medium">Contract Deployed Successfully!</p>
                            <p className="text-xs text-green-600 mt-1">
                              <strong>Address:</strong> {message.contractData.deployedAddress}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              <strong>Transaction:</strong> {formatAddress(message.contractData.deploymentTx || '')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="text-left mb-4">
                  <div className="inline-block max-w-[80%] p-3 rounded-2xl bg-gray-200 text-gray-800">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex space-x-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Base or request a smart contract..."
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What is Base?",
                  "How does gas work?",
                  "Create an ERC20 token called BaseCoin",
                  "Generate an NFT with royalties",
                  "Make a staking contract with 30 day lock",
                  "Create a DAO with 40% quorum"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-gray-50 hover:bg-base-primary/10"
                    onClick={() => {
                      setInputValue(suggestion);
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contract Interaction and Verification Widgets */}
        {selectedDeployedContract && (
          <>
            <ContractInteractionWidget contract={selectedDeployedContract} />
            
            {/* Add the verification component */}
            {selectedDeployedContract.address && (
              <ContractVerification 
                contractAddress={selectedDeployedContract.address}
                contractName={selectedDeployedContract.name}
                sourceCode={messages.find(m => 
                  m.contractData?.deployedAddress === selectedDeployedContract.address
                )?.contractData?.code || ""}
                abi={selectedDeployedContract.abi}
              />
            )}
          </>
        )}
        
        {/* Deployed Contracts List */}
        <DeployedContractsList onContractSelect={setSelectedDeployedContract} />
      </div>
      
      {/* Add footer with Twitter link */}
      <footer className="mt-10 pb-6 text-center text-sm text-gray-500">
        <p>
          Follow me on X:{" "}
          <a 
            href="https://x.com/0xFred_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base-accent hover:underline transition-colors"
          >
            @0xFred_
          </a>
        </p>
      </footer>
    </div>
  );
};

export default ChatInterface;
