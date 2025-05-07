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
  AlertCircle
} from "lucide-react";
import { useWeb3 } from "@/components/web3/Web3Provider";
import { MONAD_TESTNET } from "@/config/monad";
import { hasEnoughBalance, deployContract, formatAddress } from "@/utils/blockchain";
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
  role: 'user' | 'assistant';
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

const ChatInterface: React.FC = () => {
  const { account, signer, isConnected, connectWallet } = useWeb3();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock explanations from Monad documentation with more technical detail
  const explanations = {
    "what is monad": {
      content: "Monad is a high-performance Layer 1 blockchain designed for maximum throughput and decentralization. It features a specialized parallel transaction processing architecture that allows for concurrent execution of smart contracts, enabling significantly higher throughput compared to traditional blockchains without sacrificing security or decentralization.",
      sources: ["https://docs.monad.xyz/overview"]
    },
    "how fast is monad": {
      content: "Monad delivers exceptional performance with thousands of transactions per second and sub-second finality. The parallel execution model identifies non-conflicting transactions that can be executed simultaneously, dramatically improving throughput while maintaining EVM compatibility. This architecture enables Monad to scale efficiently with increasing hardware capacity.",
      sources: ["https://docs.monad.xyz/overview", "https://www.monad.xyz/blog/performance"]
    },
    "what language does monad use": {
      content: "Monad is fully EVM-compatible, supporting Solidity version 0.8.20 and above. This ensures seamless migration of existing Ethereum dApps to Monad with minimal or no code changes. You can use standard Solidity development tools like Hardhat, Foundry, and Remix with Monad, leveraging the mature Ethereum development ecosystem.",
      sources: ["https://docs.monad.xyz/developers/guide"]
    },
    "how does gas work": {
      content: "Gas in Monad works similarly to Ethereum. It's a unit that measures computational effort required to execute operations. Each operation has a fixed gas cost, and users specify a gas price they're willing to pay. Monad's parallel execution model helps optimize gas usage, leading to lower transaction costs compared to traditional blockchains.",
      sources: ["https://docs.monad.xyz/developers/guide"]
    },
    "default": {
      content: "Monad is a high-performance Layer 1 blockchain built from the ground up for scalability without sacrificing decentralization. It features parallel transaction execution, EVM compatibility for easy migration of Ethereum dApps, and a novel consensus mechanism designed for high throughput and security.",
      sources: ["https://docs.monad.xyz/overview", "https://www.monad.xyz/blog"]
    }
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
  }, []);

  // Function to get time-based greeting
  const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return "Good morning! 🌅 I'm Monad AI, your expert Solidity developer assistant. How can I help with your smart contract development today? Whether you need a new contract or want to modify an existing one, I'm here to assist.";
    } else if (hour < 18) {
      return "Good afternoon! 🌞 I'm Monad AI, your expert Solidity developer assistant. What kind of smart contract would you like to work on today? I can help with tokens, NFTs, staking, DAOs, or custom implementations.";
    } else {
      return "Good evening! 🌙 I'm Monad AI, your expert Solidity developer assistant. Looking to develop smart contracts for Monad? I can help you create or refine any Ethereum-compatible contract with the latest Solidity standards.";
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      const normalizedInput = inputValue.toLowerCase().trim();
      
      // Check if the message is a greeting
      if (isGreeting(normalizedInput)) {
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

  // Handle greeting messages
  const handleGreeting = async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const greetingMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: "Hello! 👋 I'm Monad AI, your expert Solidity developer assistant. I can help you create or modify smart contracts for the Monad blockchain. What type of contract would you like to work on today?",
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, greetingMessage]);
  };

  // Function to determine if a message is asking for a smart contract
  const isContractRequest = (message: string): boolean => {
    const contractKeywords = [
      'create contract', 'generate contract', 'make contract', 
      'solidity', 'smart contract', 'erc20', 'erc721', 'erc1155',
      'nft contract', 'token contract', 'write contract', 'code', 
      'implement contract', 'develop contract', 'staking contract',
      'governance', 'dao', 'upgradeable', 'upgradable', 'proxy',
      'timelock', 'vesting', 'multisig', 'multi-sig', 'add burnable',
      'add feature', 'add capability', 'make it upgradable', 'royalties',
      'modify', 'update contract', 'improve', 'airdrop', 'soulbound',
      'metadata', 'reveal'
    ];
    
    return contractKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  // Handle explanation requests with more technical detail
  const handleExplanationRequest = async (message: string, messageId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find the most relevant explanation
    let result;
    for (const [key, value] of Object.entries(explanations)) {
      if (message.includes(key)) {
        result = value;
        break;
      }
    }
    
    // Use default if no match found
    if (!result) {
      result = explanations.default;
    }
    
    // Format the answer with sources
    const formattedAnswer = `
${result.content}

Sources:
${result.sources.map(source => `- [${source}](${source})`).join('\n')}
    `;
    
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: formattedAnswer,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
  };

  // Enhanced contract request handling with context awareness
  const handleContractRequest = async (message: string, messageId: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if this is a modification to an existing contract
    const isModification = message.toLowerCase().includes('add') || 
                         message.toLowerCase().includes('update') || 
                         message.toLowerCase().includes('modify') ||
                         message.toLowerCase().includes('change');
    
    // If current contract exists and this is a modification request, use that context
    if (isModification && currentContract?.code) {
      // Generate a response acknowledging the modification request
      const modificationRequestMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I'll modify the current ${currentContract.type} contract to implement your request. Generating updated code...`,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, modificationRequestMessage]);
    }
    
    // Check if this is a generic contract request or a specific one
    const isGenericRequest = 
      message.includes('contract') && 
      !message.includes('name') && 
      !message.includes('symbol') &&
      !message.includes('called') &&
      !message.includes('create') &&
      !message.includes('generate') &&
      !message.includes('build');
    
    if (isGenericRequest) {
      // Ask for more details before generating
      const detailRequestMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'd be happy to create a smart contract for you. Could you provide some specific details like the token name, symbol, or functionality you need? For example, do you want an ERC20 token, NFT collection, staking mechanism, or something else?",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, detailRequestMessage]);
      return;
    }
    
    // Generate a contract based on the message using enhanced generator
    console.log('Generating contract from prompt:', message);
    const contractResult = generateContract(message);
    
    console.log('Generated contract:', contractResult);
    
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `I've generated a ${contractResult.type} contract named ${contractResult.name} based on your requirements. The contract includes all necessary functionality with proper security measures and follows current Solidity best practices. You can now compile and deploy it to the Monad Testnet.`,
      timestamp: Date.now(),
      contractData: {
        code: contractResult.code,
        name: contractResult.name,
        type: contractResult.type
      }
    };
    
    setMessages(prev => [...prev, assistantMessage]);
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
    
    setIsCompiling(true);
    setIsCompiled(false);
    setCompilationError(null);
    
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
        content: "Contract compiled successfully! You can now deploy it to the Monad Testnet.",
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
      
      if (account) {
        const hasEnough = await hasEnoughBalance(account);
        if (!hasEnough) {
          throw new Error("Insufficient balance for deployment. Please get tokens from the faucet.");
        }
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
        content: `Contract deployed successfully to the Monad Testnet at address ${result.address}`,
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
    window.open(`${MONAD_TESTNET.blockExplorerUrl}/address/${address}`, '_blank');
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
    return "Deploy contract to Monad Testnet";
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold text-monad-primary mb-2">Welcome to Monad AI 👨‍🔬</h1>
        <p className="text-lg text-gray-600 italic">
          Expert Solidity developer assistant for the Monad blockchain
        </p>
      </div>

      {!isConnected ? (
        <Card className="mb-6 animate-scale-in shadow-lg border-monad-accent/20">
          <CardContent className="pt-6">
            <Alert className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5 border-monad-primary/20">
              <FileCode className="h-5 w-5 text-monad-primary" />
              <AlertDescription className="flex flex-col items-center space-y-4">
                <p className="text-center">Connect your wallet to deploy smart contracts to the Monad Testnet.</p>
                <Button 
                  className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
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
        <Card className="flex-1 animate-fade-in shadow-lg border-monad-accent/20">
          <CardHeader className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5">
            <CardTitle className="flex items-center text-monad-primary">
              <MessageSquare className="mr-2 h-5 w-5 text-monad-accent" />
              Monad AI Chat
            </CardTitle>
            <CardDescription>
              Ask questions about Monad or request smart contract generation
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
                        ? 'bg-monad-primary text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="text-sm mb-1">
                      {message.role === 'user' ? 'You' : 'Monad AI'} • {formatDate(message.timestamp)}
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
                              className="text-monad-accent hover:underline"
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
                            className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
                            onClick={compileContract}
                            disabled={isCompiling}
                          >
                            {isCompiling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {isCompiling ? 'Compiling...' : 'Compile'}
                          </Button>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button 
                                    size="sm" 
                                    className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
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
                placeholder="Ask about Monad or request a smart contract..."
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What is Monad?",
                  "How does gas work?",
                  "Create an ERC20 token called MonadCoin",
                  "Generate an NFT with royalties",
                  "Make a staking contract with 30 day lock",
                  "Create a DAO with 40% quorum"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-gray-50 hover:bg-monad-primary/10"
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
            className="text-monad-accent hover:underline transition-colors"
          >
            @0xFred_
          </a>
        </p>
      </footer>
    </div>
  );
};

export default ChatInterface;
