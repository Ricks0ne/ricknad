
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Blocks, TrendingUp, Activity, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchBaseNetworkMetrics, BaseNetworkMetrics } from "@/utils/blockchain";
import { Skeleton } from "@/components/ui/skeleton";

const BaseMetrics = () => {
  const previousMetrics = useRef<BaseNetworkMetrics | null>(null);
  const [tps, setTps] = useState<number | null>(null);

  const { data: metricsData, isLoading, isError, error } = useQuery({
    queryKey: ['base-mainnet-live-metrics'],
    queryFn: fetchBaseNetworkMetrics,
    refetchInterval: 4000,
    retry: 2,
  });

  useEffect(() => {
    if (!metricsData) return;
    const previous = previousMetrics.current;
    if (previous && metricsData.blockNumber !== previous.blockNumber) {
      const blockTime = (metricsData.blockTimestamp - previous.blockTimestamp) / 1000;
      setTps(blockTime > 0 ? metricsData.txCount / blockTime : 0);
    }
    previousMetrics.current = metricsData;
  }, [metricsData]);

  const metrics = [
    {
      title: "Block Height",
      value: metricsData?.blockNumber.toLocaleString() || "Loading...",
      icon: Blocks,
    },
    {
      title: "Gas Price",
      value: metricsData ? `${metricsData.gasPriceGwei} Gwei` : "Loading...",
      icon: TrendingUp,
    },
    {
      title: "Block Time",
      value: metricsData ? new Date(metricsData.blockTimestamp).toLocaleTimeString() : "Loading...",
      icon: Clock,
    },
    {
      title: "Tx / Block",
      value: metricsData?.txCount.toLocaleString() || "Loading...",
      icon: Activity,
    },
    {
      title: "Approx TPS",
      value: tps === null ? "Calculating..." : tps.toFixed(2),
      icon: AlertCircle,
    },
    {
      title: "Network",
      value: isError ? "Disconnected" : "Connected",
      icon: isError ? WifiOff : Wifi,
    },
  ];

  return (
    <Card className="mt-6 bg-black/40 border border-white/10">
      <CardHeader>
        <CardTitle>Network Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <p className="mb-4 text-sm text-destructive">{error instanceof Error ? error.message : 'Base RPC connection failed.'}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="bg-black/40 rounded-lg text-white flex flex-col items-center justify-center text-center p-4 border border-white/10 hover:border-base-primary/30 transition-all duration-300"
            >
              <metric.icon className="h-6 w-6 mb-2 text-base-primary" />
              <h3 className="text-sm font-medium text-gray-400">{metric.title}</h3>
              {isLoading ? <Skeleton className="mt-2 h-5 w-24" /> : <p className="text-lg font-bold mt-1">{metric.value}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BaseMetrics;
