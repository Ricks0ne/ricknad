import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, MessageSquare } from 'lucide-react';
import DeployedContractsList from '@/components/contract/DeployedContractsList';
import { DeployedContract } from '@/types/blockchain';

const MyContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const [, setSelectedContract] = useState<DeployedContract | null>(null);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-base-primary mb-2 flex items-center gap-3">
            <FileCode className="h-8 w-8" />
            My Contracts
          </h1>
          <p className="text-gray-600">
            Every contract you've deployed through Ricknad, saved locally to your browser.
          </p>
        </div>
        <Button
          onClick={() => navigate('/chat')}
          className="bg-base-primary text-white hover:bg-base-accent hover:text-black self-start md:self-auto"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Deploy a new contract
        </Button>
      </div>

      <Card className="mb-6 border-base-accent/20">
        <CardHeader>
          <CardTitle className="text-base">How storage works</CardTitle>
          <CardDescription>
            Contracts are saved to <code>localStorage.ricknad_deployed_contracts</code> on this
            device. Use <em>Export</em> to back up to JSON and <em>Import</em> to restore on another
            browser or machine. Clearing site data will erase the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          Each entry stores the contract name, address, ABI, bytecode, deployment tx hash,
          timestamp, deploy status, source code (if compiled in-app), and BaseScan verification
          status. Verification status is refreshed from BaseScan each time you open the
          <em> Verify</em> tab.
        </CardContent>
      </Card>

      <DeployedContractsList onContractSelect={setSelectedContract} />
    </div>
  );
};

export default MyContractsPage;
