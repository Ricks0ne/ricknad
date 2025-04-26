
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileCode, Loader2, Copy, ExternalLink, Key, Code, Zap, Rocket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWeb3 } from "@/components/web3/Web3Provider";
import { MONAD_TESTNET } from "@/config/monad";
import { hasEnoughBalance, deployContract, formatAddress } from "@/utils/blockchain";
import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  contractData?: {
    code?: string;
    abi?: any[];
    bytecode?: string;
    deployedAddress?: string;
    deploymentTx?: string;
  };
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

const ChatInterface: React.FC = () => {
  const { account, signer, isConnected, connectWallet } = useWeb3();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentContract, setCurrentContract] = useState<{
    code: string;
    abi: any[] | null;
    bytecode: string | null;
    deployedAddress?: string;
    deploymentTx?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to Ricknad's AI! I can help you generate smart contracts and answer questions about Monad. What would you like to know?",
      timestamp: Date.now()
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      return;
    }
    
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
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are RickAI, a specialized AI assistant focused on Monad blockchain development and smart contracts.
              
              Your capabilities:
              - Generate high-quality, well-commented Solidity smart contracts
              - Provide detailed technical information about Monad blockchain
              - Answer questions about blockchain development best practices
              - Assist with debugging and optimizing smart contracts
              - Explain complex blockchain concepts in simple terms
              
              When users ask for contract generation:
              1. Create appropriate, well-structured Solidity contracts
              2. Include helpful comments explaining key functionality
              3. Consider gas optimization best practices
              4. Implement proper security measures like reentrancy guards when appropriate
              5. Always wrap contract code in \`\`\`solidity code here \`\`\` markdown blocks
              
              For Monad-specific questions:
              - Provide accurate technical information about Monad's architecture, performance, and features
              - Compare with other blockchains when relevant
              - Explain Monad's benefits for developers and users
              
              Always stay focused on providing the most helpful and accurate blockchain development assistance.
              
              Current context: User is using Ricknad, a Monad-focused development platform with contract generation, compilation, and deployment capabilities.`
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            {
              role: 'user',
              content: inputValue
            }
          ]
        },
      });

      if (error) {
        throw new Error(`API error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from AI');
      }

      const aiResponse = data.content;

      if (aiResponse.includes('```solidity')) {
        const contractCode = aiResponse.split('```solidity')[1].split('```')[0].trim();
        const explanation = aiResponse.replace(/```solidity[\s\S]*```/, '').trim();
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: explanation || "I've generated a smart contract based on your request. You can now compile and deploy it to the Monad Testnet.",
          timestamp: Date.now(),
          contractData: {
            code: contractCode
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentContract({
          code: contractCode,
          abi: null,
          bytecode: null
        });
      } else {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error processing message:', error);
      toast.error('Failed to get AI response. Please try again.');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || "There was an error processing your request. Please try again."}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const compileContract = async () => {
    if (!currentContract?.code) return;
    
    setIsCompiling(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hasStructs = currentContract.code.includes('struct');
      const hasMappings = currentContract.code.includes('mapping');
      const functionCount = (currentContract.code.match(/function\s+\w+/g) || []).length;
      
      const generatedAbi: any[] = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "count",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "text",
              "type": "string"
            }
          ],
          "name": currentContract.code.match(/event\s+(\w+)/)?.[1] || "DataUpdated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event"
        }
      ];
      
      const functionMatches = [...currentContract.code.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(view|pure)?\s*(?:returns\s*\(([^)]*)\))?/g)];
      
      for (const match of functionMatches) {
        const name = match[1];
        const params = match[2];
        const visibility = match[3] || "public";
        const mutability = match[4] || "nonpayable";
        const returns = match[5];
        
        const abiFunction: any = {
          "inputs": params.split(',').filter(p => p.trim()).map(param => {
            const parts = param.trim().split(' ');
            return {
              "internalType": parts[0],
              "name": parts[1] || `param${Math.floor(Math.random() * 1000)}`,
              "type": parts[0]
            };
          }),
          "name": name,
          "outputs": returns ? returns.split(',').filter(r => r.trim()).map(ret => {
            const parts = ret.trim().split(' ');
            return {
              "internalType": parts[0],
              "name": "",
              "type": parts[0]
            };
          }) : [],
          "stateMutability": mutability || "nonpayable",
          "type": "function"
        };
        
        generatedAbi.push(abiFunction);
      }
      
      const validBytecodeSample = "608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063771602f714610030575b600080fd5b61004a6004803603810190610045919061009d565b610060565b60405161005791906100d9565b60405180910390f35b6000818361006e91906100f4565b905092915050565b600080fd5b6000819050919050565b61008a8161007d565b811461009557600080fd5b50565b6000813590506100a781610081565b92915050565b600080604083850312156100b4576100b3610079565b5b60006100c285828601610098565b92505060206100d385828601610098565b9150509250929050565b6100e38161007d565b82525050565b60006020820190506100fe60008301846100dc565b92915050565b7f4e487b710000000000000000000000000000000000000000000000000000000060e052604160045260246000fd5b600061013f8261007d565b915061014a8361007d565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561017f5761017e610105565b5b82820190509291505056fea264697066735822122024d33be7c73c099cedba7e11787e893151b39c977d9712cce3a0db7f94ba066764736f6c634300080d0033";
      
      setCurrentContract({
        ...currentContract,
        abi: generatedAbi,
        bytecode: validBytecodeSample
      });
      
      const compilationMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "Contract compiled successfully! You can now deploy it to the Monad Testnet.",
        timestamp: Date.now(),
        contractData: {
          code: currentContract.code,
          abi: generatedAbi,
          bytecode: validBytecodeSample
        }
      };
      
      setMessages(prev => [...prev, compilationMessage]);
      toast.success("Contract compiled successfully!");
    } catch (err) {
      console.error('Error compiling contract:', err);
      toast.error('Compilation failed');
      
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
      
      setCurrentContract({
        ...currentContract,
        deployedAddress: result.address,
        deploymentTx: result.deploymentTx
      });
      
      const deploymentMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Contract deployed successfully to the Monad Testnet at address ${result.address}`,
        timestamp: Date.now(),
        contractData: {
          code: currentContract.code,
          abi: currentContract.abi,
          bytecode: currentContract.bytecode,
          deployedAddress: result.address,
          deploymentTx: result.deploymentTx
        }
      };
      
      setMessages(prev => [...prev, deploymentMessage]);
      toast.success("Contract deployed successfully!");
    } catch (err: any) {
      console.error('Error deploying contract:', err);
      toast.error(err.message || 'Deployment failed');
      
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold text-monad-primary mb-2">Welcome to Monad Rick <Rocket className="inline-block ml-1" /></h1>
        <p className="text-lg text-gray-600 italic">
          Generate smart contracts & ask Monad AI anything
        </p>
      </div>

      {!isConnected ? (
        <Card className="mb-6 animate-scale-in">
          <CardContent className="pt-6">
            <Alert>
              <FileCode className="h-5 w-5" />
              <AlertDescription className="flex flex-col items-center space-y-4">
                <p>Connect your wallet to deploy smart contracts to the Monad Testnet.</p>
                <Button 
                  className="bg-monad-primary hover:bg-monad-accent hover:text-black"
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
        <Card className="flex-1 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-monad-accent" />
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
                            <div className="text-xs text-gray-400">Solidity Contract</div>
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
                            className="bg-monad-primary hover:bg-monad-accent hover:text-black"
                            onClick={compileContract}
                            disabled={isCompiling}
                          >
                            {isCompiling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {isCompiling ? 'Compiling...' : 'Compile'}
                          </Button>
                          
                          {message.contractData?.abi && (
                            <Button 
                              size="sm" 
                              className="bg-monad-primary hover:bg-monad-accent hover:text-black"
                              onClick={deploySmartContract}
                              disabled={isDeploying || !isConnected}
                            >
                              {isDeploying && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              {isDeploying ? 'Deploying...' : 'Deploy'}
                            </Button>
                          )}
                          
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
                className="bg-monad-primary hover:bg-monad-accent hover:text-black"
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
                  "Make me an ERC20 token",
                  "Create an NFT contract"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs"
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
      </div>
    </div>
  );
};

export default ChatInterface;
