
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, ExternalLink, FileText, Search, Trash2, SquareCheck, Loader } from 'lucide-react';
import { DeployedContract } from '@/types/blockchain';
import { formatAddress } from '@/utils/blockchain';
import { MONAD_TESTNET } from '@/config/monad';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContractInteractionWidget from './ContractInteractionWidget';

interface DeployedContractsListProps {
  onContractSelect: (contract: DeployedContract) => void;
}

const DeployedContractsList: React.FC<DeployedContractsListProps> = ({ onContractSelect }) => {
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<DeployedContract | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // Load contracts from local storage
  useEffect(() => {
    try {
      const storedContracts = localStorage.getItem('ricknad_deployed_contracts');
      if (storedContracts) {
        setDeployedContracts(JSON.parse(storedContracts));
      }
    } catch (error) {
      console.error('Failed to load deployed contracts:', error);
    }
  }, []);

  // Save contracts to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('ricknad_deployed_contracts', JSON.stringify(deployedContracts));
    } catch (error) {
      console.error('Failed to save deployed contracts:', error);
    }
  }, [deployedContracts]);

  // Clean up export URL when dialog closes
  useEffect(() => {
    if (!isDialogOpen && exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
  }, [isDialogOpen, exportUrl]);

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Open in explorer
  const openInExplorer = (address: string) => {
    window.open(`${MONAD_TESTNET.blockExplorerUrl}/address/${address}`, '_blank');
  };

  // Delete contract
  const deleteContract = (address: string) => {
    setDeployedContracts(prev => prev.filter(c => c.address !== address));
    toast.success('Contract removed from history');
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Handle search
  const filteredContracts = deployedContracts.filter(contract => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      contract.address.toLowerCase().includes(searchTermLower) ||
      contract.name.toLowerCase().includes(searchTermLower) ||
      new Date(contract.timestamp).toLocaleDateString().includes(searchTerm)
    );
  });

  // Export contracts as JSON
  const exportContracts = () => {
    const data = JSON.stringify(deployedContracts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    setExportUrl(url);
  };

  // Import contracts from JSON
  const importContracts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const contracts = JSON.parse(e.target?.result as string);
        if (Array.isArray(contracts)) {
          setDeployedContracts(contracts);
          toast.success(`Imported ${contracts.length} contracts`);
        } else {
          throw new Error('Invalid format');
        }
      } catch (error) {
        toast.error('Failed to import contracts: Invalid file format');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Get contract type label and icon
  const getContractTypeInfo = (type: string) => {
    switch (type) {
      case 'erc20':
        return { label: 'ERC-20 Token', color: 'text-blue-600' };
      case 'erc721':
        return { label: 'ERC-721 NFT', color: 'text-purple-600' };
      case 'erc1155':
        return { label: 'ERC-1155 Multi-Token', color: 'text-indigo-600' };
      case 'staking':
        return { label: 'Staking Contract', color: 'text-green-600' };
      case 'governance':
        return { label: 'Governance', color: 'text-orange-600' };
      case 'proxy':
        return { label: 'Upgradeable Proxy', color: 'text-amber-600' };
      default:
        return { label: 'Smart Contract', color: 'text-gray-600' };
    }
  };

  return (
    <Card className="mt-8 shadow-lg border-monad-accent/20 overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5">
        <CardTitle className="text-lg md:text-2xl text-monad-primary flex items-center">
          <div className="p-2 rounded-full bg-monad-accent/10 mr-2">
            <FileText size={18} className="text-monad-primary" />
          </div>
          My Deployed Contracts
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>View and interact with your deployed contracts</span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportContracts}
              className="text-xs"
              disabled={deployedContracts.length === 0}
            >
              Export
            </Button>
            
            <label>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                asChild
              >
                <span>Import</span>
              </Button>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={importContracts}
              />
            </label>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-6">
        <div className="mb-4 flex w-full items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by contract name, address, or date"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        
        {deployedContracts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-gray-500">No contracts deployed yet</p>
            <p className="text-sm text-gray-400 mt-2">Your deployed contracts will appear here</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-gray-500">No contracts found matching your search</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract) => {
              const typeInfo = getContractTypeInfo(contract.type);
              
              return (
                <div 
                  key={contract.address} 
                  className="border rounded-lg overflow-hidden hover:border-monad-accent/50 transition-colors group"
                >
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between bg-white">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">{contract.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="flex items-center mr-4">
                          Address: <span className="font-mono ml-1">{formatAddress(contract.address)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-6 w-6 ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => copyToClipboard(contract.address)}
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                        
                        <div className="hidden md:block">
                          {formatDate(contract.timestamp)}
                        </div>
                      </div>
                      
                      <div className="md:hidden text-xs text-gray-400 mt-1">
                        {formatDate(contract.timestamp)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-3 md:mt-0">
                      <div className="flex items-center mr-2 text-sm">
                        Status: 
                        {contract.status === 'success' ? (
                          <span className="flex items-center text-green-500 ml-1">
                            <SquareCheck size={16} className="mr-1" />
                            Success
                          </span>
                        ) : contract.status === 'pending' ? (
                          <span className="flex items-center text-amber-500 ml-1">
                            <Loader size={16} className="mr-1 animate-spin" />
                            Pending
                          </span>
                        ) : (
                          <span className="flex items-center text-red-500 ml-1">
                            Failed
                          </span>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-monad-primary text-white hover:bg-monad-accent hover:text-black"
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsDialogOpen(true);
                        }}
                      >
                        <FileText size={14} className="mr-1" />
                        View & Interact
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openInExplorer(contract.address)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        Explorer
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-400 hover:text-red-500"
                        onClick={() => deleteContract(contract.address)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Contract Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contract: {selectedContract?.name}</DialogTitle>
              <DialogDescription>
                Address: {selectedContract?.address}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="interact">
              <TabsList className="w-full">
                <TabsTrigger value="interact">Interact</TabsTrigger>
                <TabsTrigger value="abi">ABI</TabsTrigger>
              </TabsList>
              
              <TabsContent value="interact" className="mt-4">
                {selectedContract && (
                  <ContractInteractionWidget contract={selectedContract} />
                )}
              </TabsContent>
              
              <TabsContent value="abi" className="mt-4">
                {selectedContract && (
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => selectedContract && copyToClipboard(JSON.stringify(selectedContract.abi, null, 2))}
                      className="mb-2"
                    >
                      <Copy size={14} className="mr-1" />
                      Copy ABI
                    </Button>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedContract.abi, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-4">
              <div className="flex justify-between w-full">
                <Button 
                  variant="outline"
                  onClick={() => openInExplorer(selectedContract?.address || '')}
                >
                  <ExternalLink size={16} className="mr-2" />
                  Open in Explorer
                </Button>
                
                <Button 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Export Dialog */}
        <Dialog open={!!exportUrl} onOpenChange={(open) => !open && setExportUrl(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Contracts</DialogTitle>
              <DialogDescription>
                Your contracts have been prepared for export
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">
              Download this JSON file to back up your deployed contracts. You can import it later to restore your contracts history.
            </p>
            <DialogFooter>
              <Button asChild>
                <a 
                  href={exportUrl || '#'} 
                  download="ricknad_deployed_contracts.json"
                  onClick={() => setTimeout(() => setExportUrl(null), 500)}
                >
                  Download JSON
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DeployedContractsList;
