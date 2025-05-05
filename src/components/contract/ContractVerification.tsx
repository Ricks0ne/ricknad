
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCcw 
} from "lucide-react";
import { toast } from "sonner";
import { MONAD_TESTNET } from "@/config/monad";
import { 
  verifyContractOnSourcify, 
  getVerificationStatus, 
  saveVerificationStatus, 
  VerificationStatus,
  checkExplorerVerificationStatus,
  refreshVerificationStatus
} from "@/utils/verification";

interface ContractVerificationProps {
  contractAddress: string;
  contractName: string;
  sourceCode: string;
  abi: any[];
}

const ContractVerification: React.FC<ContractVerificationProps> = ({
  contractAddress,
  contractName,
  sourceCode,
  abi
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    getVerificationStatus(contractAddress)
  );
  const [explorerVerified, setExplorerVerified] = useState<boolean | null>(null);
  const [isCheckingExplorer, setIsCheckingExplorer] = useState(false);
  
  // Check if the contract is verified on the explorer when the component loads
  useEffect(() => {
    if (verificationStatus === 'success' && explorerVerified === null) {
      checkExplorerStatus();
    }
  }, [verificationStatus, explorerVerified]);
  
  const checkExplorerStatus = async () => {
    if (isCheckingExplorer) return;
    
    setIsCheckingExplorer(true);
    try {
      const isVerifiedOnExplorer = await checkExplorerVerificationStatus(contractAddress);
      setExplorerVerified(isVerifiedOnExplorer);
    } catch (error) {
      console.error("Error checking explorer status:", error);
    } finally {
      setIsCheckingExplorer(false);
    }
  };
  
  const handleVerify = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setVerificationStatus('pending');
    saveVerificationStatus(contractAddress, 'pending');
    
    try {
      const result = await verifyContractOnSourcify(
        contractAddress,
        contractName,
        sourceCode,
        abi
      );
      
      if (result.status === 'success') {
        setVerificationStatus('success');
        saveVerificationStatus(contractAddress, 'success');
        // After successful verification, check if it's reflected on explorer
        setTimeout(() => {
          checkExplorerStatus();
        }, 2000);
      } else {
        setVerificationStatus('failure');
        saveVerificationStatus(contractAddress, 'failure');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      setVerificationStatus('failure');
      saveVerificationStatus(contractAddress, 'failure');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsCheckingExplorer(true);
    const updatedStatus = await refreshVerificationStatus(contractAddress);
    setVerificationStatus(updatedStatus);
    
    if (updatedStatus === 'success') {
      setExplorerVerified(true);
    } else {
      await checkExplorerStatus();
    }
    setIsCheckingExplorer(false);
  };
  
  const explorerUrl = `${MONAD_TESTNET.blockExplorerUrl}/address/${contractAddress}`;
  
  return (
    <Card className="mt-4 border-monad-accent/20 overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5">
        <CardTitle className="flex items-center text-monad-primary">
          <ShieldCheck className="mr-2 h-5 w-5" />
          🔒 Verify Your Contract on Sourcify
        </CardTitle>
        <CardDescription>
          Increase transparency and trust by verifying your smart contract's source code
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <Alert className="bg-gradient-to-r from-monad-primary/10 to-monad-primary/5 border-monad-primary/20">
            <AlertDescription>
              <p className="mb-2">
                Contract verification allows anyone to view and audit your smart contract's source code.
                This builds trust and transparency for your users and the wider blockchain community.
              </p>
              <p>
                Sourcify is a decentralized verification platform that preserves your contract's
                source code and metadata, making it accessible for everyone.
              </p>
            </AlertDescription>
          </Alert>
          
          {verificationStatus === 'success' ? (
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="default" className="bg-green-500 text-white flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Verified on Sourcify
                </Badge>
                
                {explorerVerified === true ? (
                  <Badge variant="default" className="bg-blue-500 text-white flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Verified on Monad Explorer
                  </Badge>
                ) : explorerVerified === false ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-500 border-orange-200 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Pending on Monad Explorer
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRefresh}
                      disabled={isCheckingExplorer}
                      className="h-6 text-xs"
                    >
                      {isCheckingExplorer ? (
                        <Loader2 size={12} className="mr-1 animate-spin" />
                      ) : (
                        <RefreshCcw size={12} className="mr-1" />
                      )}
                      Sync
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-200 flex items-center gap-1">
                    {isCheckingExplorer ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    Checking Explorer Status...
                  </Badge>
                )}
              </div>
              <p className="text-sm text-green-700 mb-3">
                Your contract has been successfully verified. The source code is now publicly available on Sourcify.
                {explorerVerified === false && 
                  " It may take a few minutes for the verification to be reflected on Monad Explorer."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-sm flex items-center"
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink size={16} className="mr-2" />
                  View on Monad Explorer
                </Button>
                
                {explorerVerified === false && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-sm flex items-center"
                    onClick={handleRefresh}
                    disabled={isCheckingExplorer}
                  >
                    {isCheckingExplorer ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <RefreshCcw size={16} className="mr-2" />
                    )}
                    Refresh Verification Status
                  </Button>
                )}
              </div>
            </div>
          ) : verificationStatus === 'failure' ? (
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <Badge variant="destructive" className="flex items-center gap-1 mb-2">
                <AlertCircle size={12} />
                Verification Failed
              </Badge>
              <p className="text-sm text-red-700 mb-3">
                There was a problem verifying your contract. This could be due to:
              </p>
              <ul className="list-disc pl-5 text-xs text-red-600 mb-3">
                <li>Incorrect contract source code or ABI</li>
                <li>Compiler version mismatch</li>
                <li>Missing dependencies in your contract code</li>
                <li>Optimization settings mismatch</li>
              </ul>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button 
                  size="sm"
                  onClick={handleVerify}
                  className="bg-monad-accent hover:bg-monad-accent/80 text-black flex items-center"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck size={16} className="mr-2" />
                  )}
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-sm flex items-center"
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink size={16} className="mr-2" />
                  View on Monad Explorer
                </Button>
              </div>
            </div>
          ) : verificationStatus === 'pending' ? (
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-center mb-2">
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  Verification in Progress
                </Badge>
              </div>
              <div className="flex items-center justify-center p-4">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-monad-accent" />
                  <p className="text-sm text-yellow-700">
                    Verifying your contract on Sourcify...
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    This process usually takes 15-30 seconds
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm mb-3">
                  Your contract is not verified yet. Verifying your contract allows anyone to inspect and audit your code, 
                  increasing transparency and user trust.
                </p>
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-monad-accent hover:bg-monad-accent/80 text-black flex items-center"
                >
                  {isVerifying ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck size={16} className="mr-2" />
                  )}
                  Verify on Sourcify
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p>Network: Monad Testnet (Chain ID: 10143)</p>
            <p className="mt-1">Contract Address: {contractAddress}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractVerification;
