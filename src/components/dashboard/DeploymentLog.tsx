
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { formatAddress } from "@/utils/blockchain";
import { Logs, ExternalLink } from "lucide-react";
import { MONAD_TESTNET } from "@/config/monad";

interface DeploymentEntry {
  address: string;
  timestamp: number;
  deploymentTx: string;
}

const DeploymentLog = () => {
  // Mock query to simulate fetching deployment logs
  // In a real app, this would fetch from a backend
  const { data: deployments } = useQuery({
    queryKey: ['deployments'],
    queryFn: async () => {
      // Simulate API call with mock data
      const mockDeployments: DeploymentEntry[] = [
        {
          address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          timestamp: Date.now() - 300000,
          deploymentTx: "0x123...abc"
        },
        {
          address: "0x123d35Cc6634C0532925a3b844Bc454e4438f123",
          timestamp: Date.now() - 900000,
          deploymentTx: "0x456...def"
        },
        {
          address: "0x456d35Cc6634C0532925a3b844Bc454e4438f456",
          timestamp: Date.now() - 1800000,
          deploymentTx: "0x789...ghi"
        }
      ];
      return mockDeployments;
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">
          <div className="flex items-center gap-2">
            <Logs className="h-4 w-4 text-monad-accent" />
            Deployment Log
          </div>
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Last {deployments?.length || 0} deployments
        </span>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] w-full rounded-md border p-2">
          {deployments?.map((deployment, index) => (
            <div
              key={deployment.address}
              className="mb-3 last:mb-0 flex flex-col space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-monad-accent font-medium">
                  {formatTime(deployment.timestamp)}
                </span>
                <a
                  href={`${MONAD_TESTNET.blockExplorerUrl}/address/${deployment.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-monad-accent flex items-center gap-1"
                >
                  {formatAddress(deployment.address)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="text-xs text-muted-foreground">
                Tx: {formatAddress(deployment.deploymentTx)}
              </div>
              {index < deployments.length - 1 && (
                <div className="border-b border-border my-2" />
              )}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DeploymentLog;
