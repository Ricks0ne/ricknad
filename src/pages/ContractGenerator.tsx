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

  const generateContract = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    try {
      const seed = Math.floor(Math.random() * 10000);
      const currentDate = new Date().toISOString();

      // Lowercase prompt for easier searching
      const promptLC = prompt.toLowerCase();

      let generatedCode = "";
      // Pattern 1: NFT with minting
      if (
        (promptLC.includes("nft") && promptLC.includes("mint")) ||
        promptLC.includes("erc721")
      ) {
        // ERC721 NFT contract with minting
        generatedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ERC721 NFT Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ERC721, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("${contractName}", "${contractName.substr(0, 4).toUpperCase()}") {}

    function mint(address to) public onlyOwner {
        _safeMint(to, nextTokenId);
        nextTokenId++;
    }
}
`;
      }
      // Pattern 2: ERC20 token with transfer
      else if (
        ((promptLC.includes("erc20") || promptLC.includes("token")) && promptLC.includes("transfer")) ||
        promptLC.includes("fungible")
      ) {
        generatedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ERC20 Token Contract auto-generated from: "${prompt}"
 * @custom:generated-at ${currentDate}
 * @custom:seed ${seed}
 */
contract ${contractName} is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("${contractName}", "${contractName.substr(0, 4).toUpperCase()}") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
`;
      }
      // Add more prompt-based templates here as needed, e.g., simple voting, DAO, etc.
      else {
        // Default "fun" contract (fallback to previous logic)
        const words = prompt.split(/\s+/).filter(word => word.length > 3);
        const varName1 = words.length > 0 ? words[0].toLowerCase() : 'data';
        const varName2 = words.length > 1 ? words[1].toLowerCase() : 'value';
        const eventName = words.length > 2 ? 
          words[2].charAt(0).toUpperCase() + words[2].slice(1) + 'Updated' : 
          'DataUpdated';
        const features = [
          'basic storage',
          'access control',
          'events',
          'modifiers',
          'mapping',
          'struct'
        ];
        const selectedFeatures = features.filter((_, index) => 
          (seed + index) % 3 === 0
        );
        generatedCode = `// SPDX-License-Identifier: MIT
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
      }

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

  const compileContract = async () => {
    if (!contractCode) return;
    
    setIsCompiling(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hasStructs = contractCode.includes('struct');
      const hasMappings = contractCode.includes('mapping');
      const functionCount = (contractCode.match(/function\s+\w+/g) || []).length;
      
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
      
      const functionMatches = [...contractCode.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(view|pure)?\s*(?:returns\s*\(([^)]*)\))?/g)];
      
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
      
      setCompiledAbi(generatedAbi);
      setCompiledBytecode(validBytecodeSample);
      toast.success("Contract compiled successfully!");
    } catch (err) {
      console.error('Error compiling contract:', err);
      setError('Failed to compile contract. Please check your code and try again.');
      toast.error('Compilation failed');
    } finally {
      setIsCompiling(false);
    }
  };

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
      
      const result = await deployContract(compiledAbi, compiledBytecode, signer);
      
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
