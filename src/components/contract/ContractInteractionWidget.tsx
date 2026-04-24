import React, { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWeb3 } from '@/components/web3/Web3Provider';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, ExternalLink, Loader2, Play } from 'lucide-react';
import { SmartContract } from '@/types/blockchain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BASE_MAINNET } from '@/config/base';

// ---------------------------------------------------------------------------
// ABI types
// ---------------------------------------------------------------------------

interface AbiParam {
  name: string;
  type: string;
  components?: AbiParam[];
}

interface AbiFunction {
  name: string;
  type: 'function';
  stateMutability: 'view' | 'pure' | 'nonpayable' | 'payable';
  inputs: AbiParam[];
  outputs: AbiParam[];
}

interface AbiEvent {
  name: string;
  type: 'event';
  inputs: (AbiParam & { indexed?: boolean })[];
}

type AbiItem = AbiFunction | AbiEvent | { type: string; name?: string };

// Per-function transaction state machine. Drives the inline pending / tx-hash /
// success / failure UI for write functions, plus the "Result" box for reads.
type TxState =
  | { phase: 'idle' }
  | { phase: 'signing' }
  | { phase: 'pending'; txHash: string }
  | { phase: 'success'; txHash: string; blockNumber: number }
  | { phase: 'failed'; txHash?: string; message: string };

type ReadState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; value: unknown; outputs: AbiParam[] }
  | { phase: 'failed'; message: string };

// ---------------------------------------------------------------------------
// Input parsing — turn the user-entered string for one ABI parameter into the
// correctly-typed JS value that ethers expects. Throws readable errors so the
// UI can show them inline instead of generic "invalid BigNumberish string".
// ---------------------------------------------------------------------------

const parseAbiInput = (type: string, raw: string, label: string): unknown => {
  const value = raw.trim();

  // array types: uint256[], address[][], bool[3]
  if (/\]$/.test(type)) {
    const inner = type.replace(/\[\d*\]$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(value || '[]');
    } catch {
      throw new Error(`${label} must be a JSON array like [1,2,3]`);
    }
    if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array`);
    return parsed.map((item, i) =>
      parseAbiInput(inner, typeof item === 'string' ? item : JSON.stringify(item), `${label}[${i}]`),
    );
  }

  if (type === 'address') {
    if (!value) throw new Error(`${label}: address is required`);
    if (!ethers.isAddress(value)) throw new Error(`${label} is not a valid 0x… address`);
    return ethers.getAddress(value);
  }

  if (type === 'bool') {
    const v = value.toLowerCase();
    if (v === 'true') return true;
    if (v === 'false' || v === '') return false;
    throw new Error(`${label} must be "true" or "false"`);
  }

  if (/^u?int(\d*)$/.test(type)) {
    if (value === '') throw new Error(`${label}: number is required`);
    try {
      return ethers.toBigInt(value);
    } catch {
      throw new Error(`${label} must be a whole-number string (wei-denominated for token amounts)`);
    }
  }

  if (type.startsWith('bytes')) {
    if (!value) return '0x';
    if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error(`${label} must be a 0x-prefixed hex string`);
    return value;
  }

  // string and anything else we don't specially handle -> pass through.
  return value;
};

const parseEtherValue = (raw: string): bigint => {
  const value = raw.trim();
  if (!value) return 0n;
  try {
    return ethers.parseEther(value);
  } catch {
    throw new Error('msg.value must be a decimal number of ETH (e.g. 0.01)');
  }
};

// ---------------------------------------------------------------------------
// Error formatting — extract the most human-readable piece of an ethers error.
// Ethers v6 provides `shortMessage`, `reason`, and sometimes an inner RPC
// payload under `info.error.message`. MetaMask rejections come through as
// ACTION_REJECTED with a familiar "User denied" message.
// ---------------------------------------------------------------------------

const readableError = (err: unknown): string => {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const anyErr = err as Error & {
      shortMessage?: string;
      reason?: string;
      code?: string;
      info?: { error?: { message?: string } };
    };
    if (anyErr.code === 'ACTION_REJECTED') return 'Transaction rejected in wallet.';
    return (
      anyErr.shortMessage ||
      anyErr.reason ||
      anyErr.info?.error?.message ||
      anyErr.message ||
      'Transaction failed'
    );
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

// ---------------------------------------------------------------------------
// Output formatting — render the return value of a read call into human-
// readable JSX. bigints render as plain base-10 numbers, arrays/tuples expand,
// booleans get colored, addresses get linked to BaseScan.
// ---------------------------------------------------------------------------

const formatValue = (value: unknown, outputType?: string): React.ReactNode => {
  if (value == null) return <span className="text-muted-foreground">null</span>;
  if (typeof value === 'bigint') return <span className="font-mono">{value.toString()}</span>;
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-green-600' : 'text-red-600'}>{value ? 'true' : 'false'}</span>;
  }
  if (typeof value === 'string') {
    if (outputType === 'address' && ethers.isAddress(value)) {
      return (
        <a
          href={`${BASE_MAINNET.blockExplorerUrl}/address/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-base-primary hover:underline inline-flex items-center"
        >
          {value}
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      );
    }
    return <span className="font-mono break-all">{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ol className="space-y-1 list-decimal pl-6">
        {value.map((item, idx) => (
          <li key={idx}>{formatValue(item)}</li>
        ))}
      </ol>
    );
  }
  return <span className="font-mono">{String(value)}</span>;
};

// ---------------------------------------------------------------------------

interface ContractInteractionWidgetProps {
  contract: SmartContract;
}

const ContractInteractionWidget: React.FC<ContractInteractionWidgetProps> = ({ contract }) => {
  const { signer, isConnected } = useWeb3();

  // Derive read/write/events splits from the ABI. Memoized so we don't churn
  // them on every render.
  const { readFunctions, writeFunctions, events, parseError } = useMemo(() => {
    try {
      const abi = (contract?.abi || []) as AbiItem[];
      const reads: AbiFunction[] = [];
      const writes: AbiFunction[] = [];
      const evts: AbiEvent[] = [];
      for (const item of abi) {
        if (item.type === 'function') {
          const fn = item as AbiFunction;
          if (fn.stateMutability === 'view' || fn.stateMutability === 'pure') reads.push(fn);
          else writes.push(fn);
        } else if (item.type === 'event') {
          evts.push(item as AbiEvent);
        }
      }
      return { readFunctions: reads, writeFunctions: writes, events: evts, parseError: null as string | null };
    } catch (err) {
      return {
        readFunctions: [],
        writeFunctions: [],
        events: [],
        parseError: err instanceof Error ? err.message : 'Failed to parse ABI',
      };
    }
  }, [contract]);

  // Build a read-only provider from the Base mainnet RPC so read functions
  // work even without a connected wallet (as the spec requires).
  const readProvider = useMemo(() => new ethers.JsonRpcProvider(BASE_MAINNET.rpcUrl), []);

  const readContract = useMemo(() => {
    if (!contract?.address || !contract?.abi) return null;
    return new ethers.Contract(contract.address, contract.abi, readProvider);
  }, [contract, readProvider]);

  const writeContract = useMemo(() => {
    if (!contract?.address || !contract?.abi || !signer) return null;
    return new ethers.Contract(contract.address, contract.abi, signer);
  }, [contract, signer]);

  const [inputs, setInputs] = useState<Record<string, string[]>>({});
  const [payableValues, setPayableValues] = useState<Record<string, string>>({});
  const [readStates, setReadStates] = useState<Record<string, ReadState>>({});
  const [txStates, setTxStates] = useState<Record<string, TxState>>({});
  const [eventLogs, setEventLogs] = useState<Array<{ name: string; args: Record<string, unknown>; txHash: string; timestamp: number }>>([]);

  const setInput = (fnKey: string, index: number, length: number, value: string) => {
    setInputs((prev) => {
      const current = prev[fnKey] ?? Array(length).fill('');
      const next = [...current];
      next[index] = value;
      return { ...prev, [fnKey]: next };
    });
  };

  const fnKey = (fn: AbiFunction): string =>
    `${fn.name}(${fn.inputs.map((i) => i.type).join(',')})`;

  const parseFunctionInputs = (fn: AbiFunction, fk: string): unknown[] => {
    const raw = inputs[fk] ?? [];
    return fn.inputs.map((input, idx) =>
      parseAbiInput(input.type, raw[idx] ?? '', input.name || `param${idx}`),
    );
  };

  const callRead = async (fn: AbiFunction) => {
    if (!readContract) return;
    const fk = fnKey(fn);
    setReadStates((s) => ({ ...s, [fk]: { phase: 'loading' } }));
    try {
      const args = parseFunctionInputs(fn, fk);
      const value = await readContract[fn.name](...args);
      setReadStates((s) => ({ ...s, [fk]: { phase: 'success', value, outputs: fn.outputs } }));
    } catch (err) {
      const message = readableError(err);
      setReadStates((s) => ({ ...s, [fk]: { phase: 'failed', message } }));
    }
  };

  const sendWrite = async (fn: AbiFunction) => {
    if (!writeContract || !isConnected) {
      toast.error('Connect your wallet to send transactions.');
      return;
    }
    const fk = fnKey(fn);
    setTxStates((s) => ({ ...s, [fk]: { phase: 'signing' } }));
    try {
      const args = parseFunctionInputs(fn, fk);
      const overrides: ethers.Overrides = {};
      if (fn.stateMutability === 'payable') {
        overrides.value = parseEtherValue(payableValues[fk] ?? '');
      }
      const sentTx: ethers.ContractTransactionResponse = await writeContract[fn.name](...args, overrides);
      setTxStates((s) => ({ ...s, [fk]: { phase: 'pending', txHash: sentTx.hash } }));
      toast.info(`Transaction sent: ${sentTx.hash.slice(0, 10)}…`);
      const receipt = await sentTx.wait();
      if (!receipt) throw new Error('Transaction receipt unavailable.');
      if (receipt.status === 0) {
        setTxStates((s) => ({
          ...s,
          [fk]: { phase: 'failed', txHash: sentTx.hash, message: 'Transaction reverted on-chain.' },
        }));
        toast.error(`${fn.name} reverted on-chain`);
        return;
      }
      setTxStates((s) => ({
        ...s,
        [fk]: { phase: 'success', txHash: sentTx.hash, blockNumber: receipt.blockNumber },
      }));
      toast.success(`${fn.name} confirmed in block ${receipt.blockNumber}`);

      // Decode and surface any events the tx emitted.
      for (const log of receipt.logs) {
        try {
          const parsed = writeContract.interface.parseLog(log);
          if (parsed) {
            const argsRecord: Record<string, unknown> = {};
            parsed.fragment.inputs.forEach((input, idx) => {
              argsRecord[input.name || `arg${idx}`] = parsed.args[idx];
            });
            setEventLogs((prev) => [
              { name: parsed.name, args: argsRecord, txHash: sentTx.hash, timestamp: Date.now() },
              ...prev,
            ]);
          }
        } catch {
          // Logs that don't match this contract's ABI are skipped silently.
        }
      }
    } catch (err) {
      const message = readableError(err);
      setTxStates((s) => {
        const prev = s[fk];
        const txHash = prev && 'txHash' in prev ? prev.txHash : undefined;
        return { ...s, [fk]: { phase: 'failed', txHash, message } };
      });
      toast.error(`${fn.name} failed: ${message}`);
    }
  };

  if (parseError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{parseError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full bg-white shadow-lg border-base-accent/20 overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-base-primary/10 to-base-primary/5">
        <CardTitle className="text-lg md:text-2xl text-base-primary flex items-center">
          <div className="p-2 rounded-full bg-base-accent/10 mr-2">
            <Play size={18} className="text-base-primary" />
          </div>
          Contract Interaction
        </CardTitle>
        <CardDescription className="flex items-center flex-wrap gap-2">
          <span>Deployed at</span>
          <a
            href={`${BASE_MAINNET.blockExplorerUrl}/address/${contract.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs inline-flex items-center text-base-primary hover:underline"
          >
            {contract.address}
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
          <span className="text-xs text-muted-foreground">
            {readFunctions.length} read · {writeFunctions.length} write · {events.length} events
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-6">
        <Tabs defaultValue="read">
          <TabsList className="w-full mb-4 bg-gray-100">
            <TabsTrigger value="read" className="flex-1">Read</TabsTrigger>
            <TabsTrigger value="write" className="flex-1">Write</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
          </TabsList>

          {/* Read Functions */}
          <TabsContent value="read" className="space-y-4">
            {readFunctions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No read functions in this contract.</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {readFunctions.map((fn) => {
                  const fk = fnKey(fn);
                  const state = readStates[fk] ?? ({ phase: 'idle' } as ReadState);
                  return (
                    <AccordionItem value={fk} key={fk} className="border rounded-md mb-2 overflow-hidden">
                      <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                        <div className="flex items-center text-left">
                          <span className="font-mono text-sm text-base-primary">{fn.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({fn.inputs.map((i) => i.type).join(', ')}) → {fn.outputs.map((o) => o.type).join(', ') || 'void'}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {fn.inputs.map((input, idx) => (
                            <div key={idx} className="flex flex-col">
                              <label className="text-sm text-gray-700 mb-1">
                                {input.name || `param${idx}`}{' '}
                                <span className="text-xs text-gray-500">({input.type})</span>
                              </label>
                              <Input
                                value={inputs[fk]?.[idx] ?? ''}
                                onChange={(e) => setInput(fk, idx, fn.inputs.length, e.target.value)}
                                placeholder={`Enter ${input.type}`}
                                className="font-mono text-sm"
                              />
                            </div>
                          ))}
                          <Button
                            onClick={() => callRead(fn)}
                            disabled={state.phase === 'loading'}
                            className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                          >
                            {state.phase === 'loading' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Calling…
                              </>
                            ) : (
                              'Call'
                            )}
                          </Button>
                          {state.phase === 'success' && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md">
                              <div className="text-xs font-medium text-gray-700 mb-1">Result</div>
                              <div className="text-sm">
                                {Array.isArray(state.value) && state.outputs.length === state.value.length ? (
                                  <div className="space-y-1">
                                    {state.value.map((v, i) => (
                                      <div key={i} className="flex gap-2">
                                        <span className="text-xs text-muted-foreground">
                                          {state.outputs[i].name || state.outputs[i].type}:
                                        </span>
                                        <span>{formatValue(v, state.outputs[i].type)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  formatValue(state.value, fn.outputs[0]?.type)
                                )}
                              </div>
                            </div>
                          )}
                          {state.phase === 'failed' && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="break-words">{state.message}</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          {/* Write Functions */}
          <TabsContent value="write" className="space-y-4">
            {!isConnected && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  Connect your wallet to call write functions.
                </AlertDescription>
              </Alert>
            )}
            {writeFunctions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No write functions in this contract.</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {writeFunctions.map((fn) => {
                  const fk = fnKey(fn);
                  const state = txStates[fk] ?? ({ phase: 'idle' } as TxState);
                  const isBusy = state.phase === 'signing' || state.phase === 'pending';
                  return (
                    <AccordionItem value={fk} key={fk} className="border rounded-md mb-2 overflow-hidden">
                      <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                        <div className="flex items-center text-left">
                          <span className="font-mono text-sm text-base-primary">{fn.name}</span>
                          {fn.stateMutability === 'payable' && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">payable</span>
                          )}
                          <span className="ml-2 text-xs text-gray-500">
                            ({fn.inputs.map((i) => i.type).join(', ')})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {fn.inputs.map((input, idx) => (
                            <div key={idx} className="flex flex-col">
                              <label className="text-sm text-gray-700 mb-1">
                                {input.name || `param${idx}`}{' '}
                                <span className="text-xs text-gray-500">({input.type})</span>
                              </label>
                              <Input
                                value={inputs[fk]?.[idx] ?? ''}
                                onChange={(e) => setInput(fk, idx, fn.inputs.length, e.target.value)}
                                placeholder={`Enter ${input.type}`}
                                className="font-mono text-sm"
                                disabled={!isConnected || isBusy}
                              />
                            </div>
                          ))}
                          {fn.stateMutability === 'payable' && (
                            <div className="flex flex-col">
                              <label className="text-sm text-gray-700 mb-1">
                                msg.value <span className="text-xs text-gray-500">(ETH)</span>
                              </label>
                              <Input
                                value={payableValues[fk] ?? ''}
                                onChange={(e) =>
                                  setPayableValues((p) => ({ ...p, [fk]: e.target.value }))
                                }
                                placeholder="0.0"
                                className="font-mono text-sm"
                                disabled={!isConnected || isBusy}
                              />
                            </div>
                          )}
                          <Button
                            onClick={() => sendWrite(fn)}
                            disabled={!isConnected || isBusy}
                            className="bg-base-primary hover:bg-base-accent hover:text-black transition-colors"
                          >
                            {state.phase === 'signing' && (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Awaiting signature…
                              </>
                            )}
                            {state.phase === 'pending' && (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Pending confirmation…
                              </>
                            )}
                            {state.phase !== 'signing' && state.phase !== 'pending' && 'Send transaction'}
                          </Button>

                          {state.phase === 'pending' && (
                            <div className="text-xs text-muted-foreground">
                              <span>Pending: </span>
                              <a
                                href={`${BASE_MAINNET.blockExplorerUrl}/tx/${state.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-base-primary hover:underline inline-flex items-center"
                              >
                                {state.txHash.slice(0, 10)}…{state.txHash.slice(-8)}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          )}
                          {state.phase === 'success' && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm space-y-1">
                              <div className="font-medium text-green-700">Success</div>
                              <div>
                                Tx:{' '}
                                <a
                                  href={`${BASE_MAINNET.blockExplorerUrl}/tx/${state.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-base-primary hover:underline inline-flex items-center"
                                >
                                  {state.txHash.slice(0, 10)}…{state.txHash.slice(-8)}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                              <div className="text-xs text-muted-foreground">Block {state.blockNumber}</div>
                            </div>
                          )}
                          {state.phase === 'failed' && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="break-words">
                                {state.message}
                                {state.txHash && (
                                  <>
                                    {' · '}
                                    <a
                                      href={`${BASE_MAINNET.blockExplorerUrl}/tx/${state.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline"
                                    >
                                      view on BaseScan
                                    </a>
                                  </>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          {/* Event Logs */}
          <TabsContent value="events" className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-3 font-medium">Event Logs</div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {eventLogs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No events yet. Call a write function to see emitted events here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {eventLogs.map((log, idx) => (
                      <div key={`${log.txHash}-${idx}`} className="p-3 border rounded-md bg-gray-50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-base-primary">{log.name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(
                            log.args,
                            (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
                            2,
                          )}
                        </pre>
                        <a
                          href={`${BASE_MAINNET.blockExplorerUrl}/tx/${log.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-base-primary hover:underline inline-flex items-center mt-1"
                        >
                          {log.txHash.slice(0, 10)}…{log.txHash.slice(-8)}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
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
