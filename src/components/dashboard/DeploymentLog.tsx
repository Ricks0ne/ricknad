
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";

const DeploymentLog = () => {
  const { data: deploymentCount } = useQuery({
    queryKey: ['deployments-count'],
    queryFn: async () => {
      // Simulate API call with mock data
      // In a real app, this would fetch the actual number of successful
      // contract deployments after "Contract Deployed Successfully!" message
      const mockCount = 42; // This would be replaced with actual deployment count
      return mockCount;
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-monad-accent" />
            Total Deployments on Ricknad
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <span className="text-4xl font-bold text-monad-accent">
            {deploymentCount ?? 0}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeploymentLog;
