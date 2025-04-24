
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Blocks, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProvider } from "@/utils/blockchain";

const MonadMetrics = () => {
  const provider = getProvider();
  
  // Fetch current block number
  const { data: blockHeight } = useQuery({
    queryKey: ['blockHeight'],
    queryFn: async () => {
      const height = await provider.getBlockNumber();
      return height;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch recent blocks for TPS calculation
  const { data: tps } = useQuery({
    queryKey: ['tps'],
    queryFn: async () => {
      const latestBlock = await provider.getBlock('latest');
      const prevBlock = await provider.getBlock(latestBlock!.number - 1);
      
      if (!latestBlock || !prevBlock) return 0;
      
      const timeDiff = latestBlock.timestamp - prevBlock.timestamp;
      const txCount = latestBlock.transactions.length;
      
      return txCount / timeDiff;
    },
    refetchInterval: 5000,
  });

  // Fetch average gas usage
  const { data: avgGas } = useQuery({
    queryKey: ['avgGas'],
    queryFn: async () => {
      const block = await provider.getBlock('latest');
      if (!block || !block.transactions.length) return 0;
      
      const txs = await Promise.all(
        block.transactions.slice(0, 5).map(hash => provider.getTransaction(hash))
      );
      
      const totalGas = txs.reduce((acc, tx) => acc + Number(tx?.gasLimit || 0), 0);
      return Math.floor(totalGas / txs.length);
    },
    refetchInterval: 5000,
  });

  // Fetch pending transactions
  const { data: pendingTxs } = useQuery({
    queryKey: ['pendingTxs'],
    queryFn: async () => {
      const block = await provider.getBlock('latest');
      return block?.transactions.length || 0;
    },
    refetchInterval: 5000,
  });

  const metrics = [
    {
      title: "Block Height",
      value: blockHeight?.toString() || "Loading...",
      icon: Blocks,
    },
    {
      title: "TPS",
      value: tps ? tps.toFixed(2) : "Loading...",
      icon: TrendingUp,
    },
    {
      title: "Avg Gas",
      value: avgGas ? avgGas.toLocaleString() : "Loading...",
      icon: Activity,
    },
    {
      title: "Pending Txs",
      value: pendingTxs?.toString() || "Loading...",
      icon: AlertCircle,
    },
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Network Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="bg-monad-dark p-4 rounded-lg text-monad-light flex flex-col items-center justify-center text-center"
            >
              <metric.icon className="h-6 w-6 mb-2 text-monad-accent" />
              <h3 className="text-sm font-medium text-gray-400">{metric.title}</h3>
              <p className="text-lg font-bold mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonadMetrics;
