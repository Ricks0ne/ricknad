
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Play, AlertCircle, Loader2 } from 'lucide-react';
import { SmartContract } from '@/types/blockchain';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractFunction {
  name: string;
  inputs: {
    name: string;
    type: string;
  }[];
  outputs?: {
    name: string;
    type: string;
  }[];
  stateMutability: string;
  type: string;
}

interface ContractEvent {
  name: string;
  inputs: {
    name: string;
    type: string;
    indexed: boolean;
  }[];
  type: string;
}

interface ContractInteractionWidgetProps {
  contract: SmartContract;
}

const ContractInteractionWidget: React.FC<ContractInteractionWidgetProps> = ({ contract }) => {
  const { signer, isConnected } = useWeb3();
  const [contractInstance, setContractInstance] = useState<ethers.Contract | null>(null);
  const [readFunctions, setReadFunctions] = useState<ContractFunction[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<ContractFunction[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [functionInputs, setFunctionInputs] = useState<{[key: string]: string[]}>({});
  const [functionResults, setFunctionResults] = useState<{[key: string]: any}>({});
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [eventLogs, setEventLogs] = useState<{event: string, data: any, timestamp: number}[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract
  useEffect(() => {
    try {
      if (contract && contract.abi) {
        const provider = signer?.provider || new ethers.JsonRpcProvider((window as any).MONAD_RPC_URL);
        const contractInst = new ethers.Contract(
          contract.address,
          contract.abi,
          signer || provider
        );
        
        setContractInstance(contractInst);
        
        // Parse ABI to separate read and write functions
        const readFncs: ContractFunction[] = [];
        const writeFncs: ContractFunction[] = [];
        const evts: ContractEvent[] = [];
        
        contract.abi.forEach((item: any) => {
          if (item.type === 'function') {
            if (
              item.stateMutability === 'view' || 
              item.stateMutability === 'pure'
            ) {
              readFncs.push(item as ContractFunction);
            } else {
              writeFncs.push(item as ContractFunction);
            }
          } else if (item.type === 'event') {
            evts.push(item as ContractEvent);
          }
        });
        
        setReadFunctions(readFncs);
        setWriteFunctions(writeFncs);
        setEvents(evts);
        
        // Initialize inputs state
        const inputs: {[key: string]: string[]} = {};
        [...readFncs, ...writeFncs].forEach(fn => {
          inputs[fn.name] = Array(fn.inputs.length).fill('');
        });
        setFunctionInputs(inputs);
        
        setError(null);
      }
    } catch (err) {
      console.error('Error initializing contract:', err);
      setError('Failed to initialize contract. Please check the contract address and ABI.');
    }
  }, [contract, signer]);

  // Handle input change
  const handleInputChange = (functionName: string, index: number, value: string) => {
    setFunctionInputs(prev => {
      const newInputs = [...prev[functionName]];
      newInputs[index] = value;
      return { ...prev, [functionName]: newInputs };
    });
  };

  // Call read function
  const callReadFunction = async (fn: ContractFunction) => {
    if (!contractInstance) return;
    
    setIsLoading(prev => ({ ...prev, [fn.name]: true }));
    
    try {
      // Parse inputs based on types
      const parsedInputs = fn.inputs.map((input, idx) => {
        const val = functionInputs[fn.name][idx];
        
        // Handle different types
        if (input.type.includes('int')) {
          return val === '' ? 0 : ethers.toBigInt(val);
        } else if (input.type === 'bool') {
          return val.toLowerCase() === 'true';
        } else if (input.type === 'address') {
          return val || ethers.ZeroAddress;
        } else {
          return val;
        }
      });
      
      const result = await contractInstance[fn.name](...parsedInputs);
      setFunctionResults(prev => ({ ...prev, [fn.name]: result }));
      
      // Add to event logs
      setEventLogs(prev => [
        {
          event: `READ: ${fn.name}`,
          data: result,
          timestamp: Date.now()
        },
        ...prev
      ]);
    } catch (error: any) {
      console.error(`Error calling ${fn.name}:`, error);
      toast.error(`Error calling ${fn.name}: ${error.message || error}`);
      
      // Add error to event logs
      setEventLogs(prev => [
        {
          event: `ERROR: ${fn.name}`,
          data: error.message || 'Call failed',
          timestamp: Date.now()
        },
        ...prev
      ]);
    } finally {
      setIsLoading(prev => ({ ...prev, [fn.name]: false }));
    }
  };

  // Call write function
  const callWriteFunction = async (fn: ContractFunction) => {
    if (!contractInstance || !isConnected) {
      toast.error('Connect your wallet to use write functions');
      return;
    }
    
    setIsLoading(prev => ({ ...prev, [fn.name]: true }));
    
    try {
      // Parse inputs based on types
      const parsedInputs = fn.inputs.map((input, idx) => {
        const val = functionInputs[fn.name][idx];
        
        // Handle different types
        if (input.type.includes('int')) {
          return val === '' ? 0 : ethers.toBigInt(val);
        } else if (input.type === 'bool') {
          return val.toLowerCase() === 'true';
        } else if (input.type === 'address') {
          return val || ethers.ZeroAddress;
        } else {
          return val;
        }
      });
      
      // For payable functions, check for value
      const options: {value?: ethers.BigNumberish} = {};
      if (fn.stateMutability === 'payable') {
        options.value = ethers.parseEther('0.01'); // Default value, could be configurable
      }
      
      const tx = await contractInstance[fn.name](...parsedInputs, options);
      toast.info('Transaction sent. Waiting for confirmation...');
      
      // Add to event logs
      setEventLogs(prev => [
        {
          event: `SENT: ${fn.name}`,
          data: { txHash: tx.hash },
          timestamp: Date.now()
        },
        ...prev
      ]);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      setFunctionResults(prev => ({ ...prev, [fn.name]: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status ? 'Success' : 'Failed'
      }}));
      
      toast.success(`Transaction confirmed: ${fn.name}`);
      
      // Add to event logs
      setEventLogs(prev => [
        {
          event: `CONFIRMED: ${fn.name}`,
          data: {
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            status: receipt.status ? 'Success' : 'Failed'
          },
          timestamp: Date.now()
        },
        ...prev
      ]);
      
      // Look for events
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          receipt.logs.forEach((log: any) => {
            try {
              const event = contractInstance.interface.parseLog(log);
              if (event) {
                setEventLogs(prev => [
                  {
                    event: `EVENT: ${event.name}`,
                    data: event.args,
                    timestamp: Date.now()
                  },
                  ...prev
                ]);
              }
            } catch (e) {
              // Skip logs that can't be parsed
            }
          });
        } catch (e) {
          console.error('Error parsing logs:', e);
        }
      }
    } catch (error: any) {
      console.error(`Error calling ${fn.name}:`, error);
      toast.error(`Error in ${fn.name}: ${error.message || error}`);
      
      // Add error to event logs
      setEventLogs(prev => [
        {
          event: `ERROR: ${fn.name}`,
          data: error.message || 'Transaction failed',
          timestamp: Date.now()
        },
        ...prev
      ]);
    } finally {
      setIsLoading(prev => ({ ...prev, [fn.name]: false }));
    }
  };

  // Format event logs for display
  const formatEventLogValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (typeof value === 'object') {
      // For BigNumber objects from ethers
      if (value._isBigNumber || value instanceof ethers.BigInt) {
        return value.toString();
      }
      
      // Check if it's an array
      if (Array.isArray(value)) {
        return `[${value.map(item => formatEventLogValue(item)).join(', ')}]`;
      }
      
      // Handle normal objects
      try {
        return JSON.stringify(value);
      } catch (e) {
        return Object.prototype.toString.call(value);
      }
    }
    
    return String(value);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format function result for display
  const formatFunctionResult = (result: any): JSX.Element => {
    if (result === null || result === undefined) {
      return <span className="text-gray-500">No result</span>;
    }
    
    if (typeof result === 'boolean') {
      return <span className={result ? 'text-green-500' : 'text-red-500'}>
        {result.toString()}
      </span>;
    }
    
    if (typeof result === 'object') {
      // For BigNumber objects from ethers
      if (ethers.isBigInt(result)) {
        return <span className="font-mono">{result.toString()}</span>;
      }
      
      // Check if it's an array
      if (Array.isArray(result)) {
        return (
          <div className="space-y-1">
            {result.map((item, idx) => (
              <div key={idx} className="pl-4 border-l-2 border-gray-200">
                [{idx}]: {formatFunctionResult(item)}
              </div>
            ))}
          </div>
        );
      }
      
      // Transaction result
      if (result.transactionHash) {
        return (
          <div className="space-y-1">
            <div className="text-sm">Tx: <span className="font-mono text-xs">{result.transactionHash.substring(0, 10)}...{result.transactionHash.substring(result.transactionHash.length - 8)}</span></div>
            <div className="text-sm">Block: {result.blockNumber}</div>
            <div className="text-sm">Status: <span className={result.status === 'Success' ? 'text-green-500' : 'text-red-500'}>{result.status}</span></div>
          </div>
        );
      }
      
      // Handle normal objects
      try {
        return <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>;
      } catch (e) {
        return <span>{Object.prototype.toString.call(result)}</span>;
      }
    }
    
    return <span className="font-mono">{String(result)}</span>;
  };

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full bg-white shadow-lg border-monad-accent/20 overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5">
        <CardTitle className="text-lg md:text-2xl text-monad-primary flex items-center">
          <div className="p-2 rounded-full bg-monad-accent/10 mr-2">
            <Play size={18} className="text-monad-primary" />
          </div>
          Contract Interaction
        </CardTitle>
        <CardDescription>
          Interact with contract deployed at: <span className="font-mono text-xs">{contract?.address}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-6">
        <Tabs defaultValue="read">
          <TabsList className="w-full mb-4 bg-gray-100">
            <TabsTrigger value="read" className="flex-1">Read Functions</TabsTrigger>
            <TabsTrigger value="write" className="flex-1">Write Functions</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Event Logs</TabsTrigger>
          </TabsList>
          
          {/* Read Functions Tab */}
          <TabsContent value="read" className="space-y-4">
            {readFunctions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No read functions available in this contract</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {readFunctions.map((fn) => (
                  <AccordionItem value={fn.name} key={fn.name} className="border rounded-md mb-2 overflow-hidden">
                    <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                      <div className="flex items-center">
                        <span className="font-mono text-sm text-monad-primary">{fn.name}</span>
                        {fn.inputs.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({fn.inputs.map(i => `${i.type}`).join(', ')})
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {fn.inputs.length > 0 && (
                          <div className="space-y-2">
                            {fn.inputs.map((input, idx) => (
                              <div key={idx} className="flex flex-col">
                                <label className="text-sm text-gray-700 mb-1">
                                  {input.name || `param${idx}`} <span className="text-xs text-gray-500">({input.type})</span>
                                </label>
                                <Input
                                  value={functionInputs[fn.name]?.[idx] || ''}
                                  onChange={(e) => handleInputChange(fn.name, idx, e.target.value)}
                                  placeholder={`Enter ${input.type}`}
                                  className="font-mono text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => callReadFunction(fn)}
                            disabled={isLoading[fn.name]}
                            className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
                          >
                            {isLoading[fn.name] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'Call'
                            )}
                          </Button>
                        </div>
                        
                        {functionResults[fn.name] !== undefined && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <div className="text-sm font-medium text-gray-700 mb-1">Result:</div>
                            <div className="text-sm">{formatFunctionResult(functionResults[fn.name])}</div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
          
          {/* Write Functions Tab */}
          <TabsContent value="write" className="space-y-4">
            {!isConnected && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-600">
                  Connect your wallet to interact with write functions
                </AlertDescription>
              </Alert>
            )}
            
            {writeFunctions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No write functions available in this contract</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {writeFunctions.map((fn) => (
                  <AccordionItem value={fn.name} key={fn.name} className="border rounded-md mb-2 overflow-hidden">
                    <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                      <div className="flex items-center">
                        <span className="font-mono text-sm text-monad-primary">{fn.name}</span>
                        {fn.stateMutability === 'payable' && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">payable</span>
                        )}
                        {fn.inputs.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({fn.inputs.map(i => `${i.type}`).join(', ')})
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {fn.inputs.length > 0 && (
                          <div className="space-y-2">
                            {fn.inputs.map((input, idx) => (
                              <div key={idx} className="flex flex-col">
                                <label className="text-sm text-gray-700 mb-1">
                                  {input.name || `param${idx}`} <span className="text-xs text-gray-500">({input.type})</span>
                                </label>
                                <Input
                                  value={functionInputs[fn.name]?.[idx] || ''}
                                  onChange={(e) => handleInputChange(fn.name, idx, e.target.value)}
                                  placeholder={`Enter ${input.type}`}
                                  className="font-mono text-sm"
                                  disabled={!isConnected}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => callWriteFunction(fn)}
                            disabled={isLoading[fn.name] || !isConnected}
                            className="bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors"
                          >
                            {isLoading[fn.name] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Transaction'
                            )}
                          </Button>
                        </div>
                        
                        {functionResults[fn.name] !== undefined && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <div className="text-sm font-medium text-gray-700 mb-1">Transaction:</div>
                            <div className="text-sm">{formatFunctionResult(functionResults[fn.name])}</div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
          
          {/* Event Logs Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-3 font-medium">Event Logs</div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {eventLogs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No events yet. Interact with the contract to see logs.</p>
                ) : (
                  <div className="space-y-3">
                    {eventLogs.map((log, idx) => (
                      <div key={idx} className="p-3 border rounded-md bg-gray-50">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-medium ${log.event.startsWith('ERROR') ? 'text-red-600' : 'text-monad-primary'}`}>
                            {log.event}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {formatEventLogValue(log.data)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ContractInteractionWidget;
