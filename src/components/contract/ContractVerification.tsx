
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MONAD_TESTNET } from "@/config/monad";
import { verifyContractOnSourcify, getVerificationStatus, saveVerificationStatus, VerificationStatus } from "@/utils/verification";

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
        toast.success("Contract verified successfully!");
        setVerificationStatus('success');
        saveVerificationStatus(contractAddress, 'success');
      } else {
        toast.error(`Verification failed: ${result.message}`);
        setVerificationStatus('failure');
        saveVerificationStatus(contractAddress, 'failure');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      toast.error("An error occurred during verification");
      setVerificationStatus('failure');
      saveVerificationStatus(contractAddress, 'failure');
    } finally {
      setIsVerifying(false);
    }
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
              <div className="flex items-center mb-2">
                <Badge variant="default" className="bg-green-500 text-white">
                  ✅ Verified on Sourcify
                </Badge>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Your contract has been successfully verified. The source code is now publicly available on Sourcify.
              </p>
              <Button 
                variant="outline" 
                className="text-sm flex items-center"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink size={16} className="mr-2" />
                View on Monad Explorer
              </Button>
            </div>
          ) : verificationStatus === 'failure' ? (
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <Badge variant="destructive">Verification Failed</Badge>
              <p className="text-sm text-red-700 mt-2">
                There was a problem verifying your contract. Please try again or check that your contract 
                is deployed correctly.
              </p>
              <div className="mt-3">
                <Button 
                  onClick={handleVerify}
                  className="bg-monad-accent hover:bg-monad-accent/80 text-black"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {verificationStatus === 'pending' ? (
                <div className="text-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-monad-accent" />
                  <p className="text-sm">Verification in progress...</p>
                </div>
              ) : (
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-monad-accent hover:bg-monad-accent/80 text-black"
                >
                  {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify on Sourcify
                </Button>
              )}
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
