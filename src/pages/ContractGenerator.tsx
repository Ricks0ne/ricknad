
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Loader2 } from "lucide-react";
import { useWeb3 } from "@/components/web3/Web3Provider";
import { MONAD_TESTNET, DEFAULT_CONTRACT_TEMPLATE } from "@/config/monad";
import { hasEnoughBalance, deployContract } from "@/utils/blockchain";

const ContractGenerator: React.FC = () => {
  const { account, signer, isConnected } = useWeb3();
  const [prompt, setPrompt] = useState('');
  const [contractName, setContractName] = useState('MyContract');
  const [contractCode, setContractCode] = useState(DEFAULT_CONTRACT_TEMPLATE);
  const [compiledAbi, setCompiledAbi] = useState<any[]>([]);
  const [compiledBytecode, setCompiledBytecode] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [deploymentTx, setDeploymentTx] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBalance, setHasBalance] = useState(false);

  // Check wallet balance for deployment
  React.useEffect(() => {
    const checkBalance = async () => {
      if (account) {
        const hasEnough = await hasEnoughBalance(account);
        setHasBalance(hasEnough);
      }
    };
    
    if (isConnected && account) {
      checkBalance();
    }
  }, [account, isConnected]);

  // Generate contract from prompt using AI
  const generateContract = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // In a real app, this would call an AI service
      // For now we'll just simulate AI generation with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a simple contract based on the prompt
      const generatedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * Generated from prompt: "${prompt}"
 */
contract ${contractName} {
    string private message;
    address public owner;
    
    event MessageChanged(string newMessage);
    
    constructor() {
        owner = msg.sender;
        message = "Contract created from Ricknad";
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    function setMessage(string memory _message) public onlyOwner {
        message = _message;
        emit MessageChanged(_message);
    }
    
    function getMessage() public view returns (string memory) {
        return message;
    }
}`;
      
      setContractCode(generatedCode);
    } catch (err) {
      console.error('Error generating contract:', err);
      setError('Failed to generate contract. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compile the contract
  const compileContract = async () => {
    if (!contractCode) return;
    
    setIsCompiling(true);
    setError(null);
    
    try {
      // In a real app, this would use a compiler service or library
      // For now we'll simulate compilation with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulated ABI and bytecode
      const simulatedAbi = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "newMessage",
              "type": "string"
            }
          ],
          "name": "MessageChanged",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "getMessage",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_message",
              "type": "string"
            }
          ],
          "name": "setMessage",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      const simulatedBytecode = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060408051808201909152601d81526000805160206102c1833981519152602082015260019080519060200190610089929190610090565b50610190565b8280546100a0906101c9565b90600052602060002090601f0160209004810192826100c25760008555610109565b82601f106100db57805160ff1916838001178555610109565b82800160010185558215610109579182015b828111156101085782518255916020019190600101906100ed565b5b509050610116919061011a565b5090565b5b8082111561013357600081600090555060010161011b565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101c157607f821691505b6020821081036101d4576101d3610137565b5b50919050565b6101a4806101fe6000396000f3fe608060405260043610610042576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680636d4ce63c14610054575b600080fd5b34801561006057600080fd5b50610069610089565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff168156fea2646970667358221220d78deecf583683c03d77fb1279d1d03b5b1b7fb0c2a693f41c9a294334a7c64164736f6c634300080a0033";
      
      setCompiledAbi(simulatedAbi);
      setCompiledBytecode(simulatedBytecode);
    } catch (err) {
      console.error('Error compiling contract:', err);
      setError('Failed to compile contract. Please check your code and try again.');
    } finally {
      setIsCompiling(false);
    }
  };

  // Deploy the contract
  const deploySmartContract = async () => {
    if (!compiledAbi || !compiledBytecode || !signer) return;
    
    setIsDeploying(true);
    setError(null);
    
    try {
      if (!hasBalance) {
        throw new Error("Insufficient balance for deployment. Please get tokens from the faucet.");
      }
      
      // In a real app, this would use the actual compiledAbi and bytecode
      // For the demo, we'll simulate deployment with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a random address for demonstration
      const randomAddr = `0x${Array.from({length: 40}, () => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;
      const randomTxHash = `0x${Array.from({length: 64}, () => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;
      
      setDeployedAddress(randomAddr);
      setDeploymentTx(randomTxHash);
    } catch (err: any) {
      console.error('Error deploying contract:', err);
      setError(err.message || 'Failed to deploy contract. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-monad-primary mb-2">AI Contract Generator</h1>
        <p className="text-gray-600">
          Generate, compile, and deploy smart contracts to the Monad Testnet
        </p>
      </div>

      {!isConnected ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Alert>
              <FileCode className="h-5 w-5" />
              <AlertTitle>Wallet Required</AlertTitle>
              <AlertDescription>
                Please connect your wallet to generate and deploy smart contracts.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : !hasBalance && isConnected ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Alert>
              <FileCode className="h-5 w-5" />
              <AlertTitle>Insufficient Funds</AlertTitle>
              <AlertDescription>
                You need MONAD tokens to deploy contracts. Get test tokens from the{" "}
                <a 
                  href={MONAD_TESTNET.faucet} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-monad-primary underline"
                >
                  Monad Faucet
                </a>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="compile">Compile</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate Smart Contract</CardTitle>
              <CardDescription>
                Describe what you want your smart contract to do
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contract Name</label>
                <Input 
                  value={contractName} 
                  onChange={(e) => setContractName(e.target.value)} 
                  placeholder="MyContract"
                  className="mb-4"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Describe your contract</label>
                <Textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="A simple token contract with transfer functionality..."
                  rows={3}
                  className="mb-4"
                />
              </div>
              
              <Button 
                className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black"
                onClick={generateContract}
                disabled={isGenerating || !prompt}
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Contract'}
              </Button>
              
              {contractCode && (
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-1">Generated Code</label>
                  <Textarea 
                    value={contractCode} 
                    onChange={(e) => setContractCode(e.target.value)} 
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compile">
          <Card>
            <CardHeader>
              <CardTitle>Compile Smart Contract</CardTitle>
              <CardDescription>
                Compile your Solidity code to deploy to Monad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!contractCode ? (
                <Alert>
                  <AlertTitle>No Contract Code</AlertTitle>
                  <AlertDescription>
                    Generate a contract first or switch to the Generate tab to enter contract code.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <Textarea 
                      value={contractCode} 
                      onChange={(e) => setContractCode(e.target.value)} 
                      rows={10}
                      className="font-mono text-sm mb-4"
                    />
                  </div>
                  
                  <Button 
                    className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black"
                    onClick={compileContract}
                    disabled={isCompiling || !contractCode}
                  >
                    {isCompiling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCompiling ? 'Compiling...' : 'Compile Contract'}
                  </Button>
                  
                  {compiledAbi.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">ABI (Application Binary Interface)</label>
                        <Textarea 
                          value={JSON.stringify(compiledAbi, null, 2)} 
                          readOnly
                          rows={5}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Bytecode</label>
                        <Textarea 
                          value={compiledBytecode} 
                          readOnly
                          rows={3}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deploy">
          <Card>
            <CardHeader>
              <CardTitle>Deploy Smart Contract</CardTitle>
              <CardDescription>
                Deploy your compiled contract to the Monad Testnet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!compiledAbi.length || !compiledBytecode ? (
                <Alert>
                  <AlertTitle>No Compiled Contract</AlertTitle>
                  <AlertDescription>
                    Compile your contract first or switch to the Compile tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-1">Contract Details</h4>
                    <div className="bg-gray-100 p-3 rounded">
                      <p className="text-sm"><strong>Name:</strong> {contractName}</p>
                      <p className="text-sm"><strong>ABI Size:</strong> {compiledAbi.length} functions</p>
                      <p className="text-sm"><strong>Bytecode Size:</strong> {compiledBytecode.length / 2 - 1} bytes</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black"
                    onClick={deploySmartContract}
                    disabled={isDeploying || !hasBalance}
                  >
                    {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isDeploying ? 'Deploying...' : 'Deploy to Monad Testnet'}
                  </Button>
                  
                  {error && (
                    <Alert className="mt-4 border-red-400">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription className="text-red-500">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {deployedAddress && (
                    <div className="mt-6 space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-700">Contract Deployed Successfully!</h4>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1 text-green-700">Contract Address</label>
                        <div className="flex">
                          <Input 
                            value={deployedAddress} 
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            className="ml-2"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(deployedAddress)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1 text-green-700">Transaction Hash</label>
                        <div className="flex">
                          <Input 
                            value={deploymentTx} 
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            className="ml-2"
                            variant="outline"
                            onClick={() => window.open(`${MONAD_TESTNET.blockExplorerUrl}/tx/${deploymentTx}`, '_blank')}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractGenerator;
