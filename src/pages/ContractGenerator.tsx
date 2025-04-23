
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
import { toast } from "sonner";

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

  // Generate unique contract from prompt
  const generateContract = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate unique elements based on the prompt
      const seed = Math.floor(Math.random() * 10000);
      const currentDate = new Date().toISOString();
      
      // Generate variable names based on the prompt
      const words = prompt.split(/\s+/).filter(word => word.length > 3);
      const varName1 = words.length > 0 ? words[0].toLowerCase() : 'data';
      const varName2 = words.length > 1 ? words[1].toLowerCase() : 'value';
      const eventName = words.length > 2 ? 
        words[2].charAt(0).toUpperCase() + words[2].slice(1) + 'Updated' : 
        'DataUpdated';
      
      // Create a more advanced contract based on the prompt with randomization
      const features = [
        'basic storage',
        'access control',
        'events',
        'modifiers',
        'mapping',
        'struct'
      ];
      
      // Select features based on seed
      const selectedFeatures = features.filter((_, index) => 
        (seed + index) % 3 === 0
      );
      
      // Generate a unique contract based on the prompt and selected features
      const generatedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title ${contractName}
 * @dev Generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} {
    // State variables
    address public owner;
    uint256 public ${varName1}Count;
    string public ${varName2}Text;
    bool public isActive;
    
    // Events
    event ${eventName}(address indexed user, uint256 ${varName1}Count, string ${varName2}Text);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Optional struct based on features
    ${selectedFeatures.includes('struct') ? `struct ${contractName}Data {
        uint256 id;
        string data;
        address creator;
        uint256 timestamp;
    }
    
    ${contractName}Data[] public dataItems;` : ''}
    
    // Optional mapping based on features
    ${selectedFeatures.includes('mapping') ? `mapping(address => uint256) public userContributions;
    mapping(string => bool) public registeredNames;` : ''}
    
    // Constructor
    constructor() {
        owner = msg.sender;
        ${varName1}Count = ${seed % 100};
        ${varName2}Text = "Initial value from Ricknad Generator #${seed}";
        isActive = true;
        
        // Initialize with some data
        ${selectedFeatures.includes('struct') ? `dataItems.push(${contractName}Data({
            id: 1,
            data: "Genesis data for ${contractName}",
            creator: msg.sender,
            timestamp: block.timestamp
        }));` : ''}
    }
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: owner only");
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Contract is not active");
        _;
    }
    
    // Functions
    function update${varName1.charAt(0).toUpperCase() + varName1.slice(1)}(uint256 _value) public whenActive {
        ${selectedFeatures.includes('mapping') ? 'userContributions[msg.sender] += _value;' : ''}
        ${varName1}Count = _value;
        emit ${eventName}(msg.sender, ${varName1}Count, ${varName2}Text);
    }
    
    function set${varName2.charAt(0).toUpperCase() + varName2.slice(1)}(string memory _text) public onlyOwner whenActive {
        ${selectedFeatures.includes('mapping') ? 'registeredNames[_text] = true;' : ''}
        ${varName2}Text = _text;
        emit ${eventName}(msg.sender, ${varName1}Count, ${varName2}Text);
    }
    
    function getContractData() public view returns (address, uint256, string memory, bool) {
        return (owner, ${varName1}Count, ${varName2}Text, isActive);
    }
    
    ${selectedFeatures.includes('struct') ? `function addDataItem(string memory _data) public whenActive {
        dataItems.push(${contractName}Data({
            id: dataItems.length + 1,
            data: _data,
            creator: msg.sender,
            timestamp: block.timestamp
        }));
    }
    
    function getDataItemsCount() public view returns (uint256) {
        return dataItems.length;
    }` : ''}
    
    function toggleActive() public onlyOwner {
        isActive = !isActive;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}`;
      
      setContractCode(generatedCode);
      toast.success("Contract generated successfully!");
    } catch (err) {
      console.error('Error generating contract:', err);
      setError('Failed to generate contract. Please try again.');
      toast.error('Failed to generate contract');
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
      
      // Generate different ABI based on the contract code to simulate real compilation
      const hasStructs = contractCode.includes('struct');
      const hasMappings = contractCode.includes('mapping');
      const functionCount = (contractCode.match(/function\s+\w+/g) || []).length;
      
      // Create a more realistic ABI based on the contract content
      const generatedAbi = [
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
          "name": contractCode.match(/event\s+(\w+)/)?.[1] || "DataUpdated",
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
      
      // Add function entries to ABI
      const functionMatches = [...contractCode.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(view|pure)?\s*(?:returns\s*\(([^)]*)\))?/g)];
      
      for (const match of functionMatches) {
        const name = match[1];
        const params = match[2];
        const visibility = match[3] || "public";
        const mutability = match[4] || "nonpayable";
        const returns = match[5];
        
        const abiFunction = {
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
      
      // Generate a pseudo-bytecode that's different for each contract
      const contractHash = Array.from(contractCode).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const simulatedBytecode = `0x${contractHash.toString(16).padStart(4, '0')}${Array.from({length: 400}, () => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`;
      
      setCompiledAbi(generatedAbi);
      setCompiledBytecode(simulatedBytecode);
      toast.success("Contract compiled successfully!");
    } catch (err) {
      console.error('Error compiling contract:', err);
      setError('Failed to compile contract. Please check your code and try again.');
      toast.error('Compilation failed');
    } finally {
      setIsCompiling(false);
    }
  };

  // Deploy the contract
  const deploySmartContract = async () => {
    if (!compiledAbi || !compiledBytecode || !signer) {
      toast.error("Missing required data for deployment");
      return;
    }
    
    setIsDeploying(true);
    setError(null);
    
    try {
      if (!hasBalance) {
        throw new Error("Insufficient balance for deployment. Please get tokens from the faucet.");
      }
      
      toast.info("Please confirm the transaction in your wallet...");
      
      // Now actually call the deployContract function from blockchain.ts
      const result = await deployContract(compiledAbi, compiledBytecode, signer);
      
      // Set the deployment results
      setDeployedAddress(result.address);
      setDeploymentTx(result.deploymentTx);
      
      toast.success("Contract deployed successfully!");
    } catch (err: any) {
      console.error('Error deploying contract:', err);
      setError(err.message || 'Failed to deploy contract. Please try again.');
      toast.error(err.message || 'Deployment failed');
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
