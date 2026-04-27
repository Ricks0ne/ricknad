import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Hash,
  RefreshCw,
  Search,
  TimerReset,
  Wallet,
} from "lucide-react";
import {
  RateLimitError,
  WalletAnalytics,
  formatAddress,
  isValidWalletAddress,
  scanWalletAnalytics,
} from "@/utils/blockchain";
import { BASE_MAINNET } from "@/config/base";

const REFRESH_INTERVAL_MS = 15_000;
const TX_PREVIEW_LIMIT = 25;

const formatEthBalance = (value: string): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  if (num === 0) return "0";
  if (num < 0.0001) return num.toExponential(2);
  return num.toFixed(4);
};

const formatWalletAge = (ms: number | null): string => {
  if (ms === null || ms < 0) return "—";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "Less than a day";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days - years * 365) / 30);
  return `${years} yr${years === 1 ? "" : "s"}${remainingMonths ? ` ${remainingMonths} mo` : ""}`;
};

const formatRelativeTime = (ts: number | null): string => {
  if (!ts) return "—";
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

const formatDateTime = (ts: number | null): string => {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
};

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  durationMs?: number;
}

// Small counter that animates from 0 (or the previous value) to the new value
// using requestAnimationFrame. Used on the analytics cards.
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0, durationMs = 600 }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const factor = Math.pow(10, decimals);
  const rounded = Math.round(display * factor) / factor;
  return <span>{rounded.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, icon, children, sub }) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-base-accent">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{children}</div>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </CardContent>
  </Card>
);

interface WalletScannerProps {
  initialAddress?: string;
}

const WalletScanner: React.FC<WalletScannerProps> = ({ initialAddress = "" }) => {
  const [searchAddress, setSearchAddress] = useState(initialAddress);
  const [scannedAddress, setScannedAddress] = useState<string>("");
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const runScan = useCallback(
    async (address: string, options: { background?: boolean } = {}) => {
      const { background = false } = options;
      if (!isValidWalletAddress(address)) {
        setError("Please enter a valid EVM wallet address (0x…, 42 chars).");
        return;
      }
      if (background) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        // Progressive render: the first callback lands with normal + internal
        // txs so the 5 cards paint in a couple of seconds; the returned
        // promise carries the full snapshot including token transfers.
        const result = await scanWalletAnalytics(address, {
          onPartial: (partial) => {
            setAnalytics(partial);
            // Swap the skeleton out for the partial result immediately;
            // keep `isRefreshing` on so the refresh-button spinner signals
            // that token-transfer data is still loading.
            setIsLoading(false);
            setIsRefreshing(true);
          },
        });
        setAnalytics(result);
        setError(null);
        setIsRateLimited(false);
      } catch (err) {
        console.error("Wallet scan failed:", err);
        if (err instanceof RateLimitError) {
          setIsRateLimited(true);
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to scan wallet.");
        }
      } finally {
        setIsRefreshing(false);
        if (!background) setIsLoading(false);
      }
    },
    [],
  );

  const handleSearch = () => {
    const addr = searchAddress.trim();
    if (!addr) return;
    setScannedAddress(addr);
    runScan(addr);
  };

  // Auto-refresh every REFRESH_INTERVAL_MS for the currently-scanned wallet.
  useEffect(() => {
    if (!scannedAddress) return;
    const id = window.setInterval(() => {
      runScan(scannedAddress, { background: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [scannedAddress, runScan]);

  const showEmptyState = analytics && analytics.totalTransactions === 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search wallet address (0x…)"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={isLoading || !searchAddress.trim()}
          className="bg-base-primary hover:bg-base-accent hover:text-black"
        >
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Scanning…" : "Scan"}
        </Button>
        {scannedAddress && (
          <Button
            variant="outline"
            onClick={() => runScan(scannedAddress)}
            disabled={isLoading || isRefreshing}
            title="Refresh now"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {error && (
        <Alert variant={isRateLimited ? "default" : "destructive"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between w-full">
            <span>{error}</span>
            {scannedAddress && (
              <Button size="sm" variant="outline" onClick={() => runScan(scannedAddress)}>
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="Balance" icon={<Wallet className="h-4 w-4" />} sub="ETH on Base Mainnet">
            <AnimatedNumber value={Number(analytics.balanceEth)} decimals={4} /> ETH
          </StatCard>
          <StatCard
            title="Total Transactions"
            icon={<Hash className="h-4 w-4" />}
            sub={`${analytics.normalTxCount.toLocaleString()} normal · ${analytics.internalTxCount.toLocaleString()} internal · ${analytics.tokenTxCount.toLocaleString()} token`}
          >
            <AnimatedNumber value={analytics.totalTransactions} />
          </StatCard>
          <StatCard title="Wallet Age" icon={<TimerReset className="h-4 w-4" />} sub={analytics.firstActivityTimestamp ? `First activity: ${formatDateTime(analytics.firstActivityTimestamp)}` : "No on-chain activity"}>
            {formatWalletAge(analytics.walletAgeMs)}
          </StatCard>
          <StatCard
            title="Contracts Interacted"
            icon={<CircleDollarSign className="h-4 w-4" />}
            sub="Verified via eth_getCode"
          >
            <AnimatedNumber value={analytics.uniqueContractsInteracted} />
          </StatCard>
          <StatCard title="Last Active" icon={<Clock className="h-4 w-4" />} sub={analytics.lastActivityTimestamp ? formatDateTime(analytics.lastActivityTimestamp) : "—"}>
            {formatRelativeTime(analytics.lastActivityTimestamp)}
          </StatCard>
        </div>
      ) : null}

      {analytics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {showEmptyState
                  ? "No transactions found for this wallet on Base Mainnet."
                  : `Showing ${Math.min(TX_PREVIEW_LIMIT, analytics.transactions.length)} of ${analytics.totalTransactions.toLocaleString()} records (normal + internal + token) · source: ${analytics.source === "etherscan-v2" ? "BaseScan (Etherscan V2)" : "Blockscout"} · auto-refresh every 15s`}
              </CardDescription>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {showEmptyState ? (
              <div className="text-center py-6 text-muted-foreground">No transactions found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Value (ETH)</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...analytics.transactions]
                    .slice(-TX_PREVIEW_LIMIT)
                    .reverse()
                    .map((tx) => (
                      <TableRow key={tx.hash}>
                        <TableCell>
                          <a
                            href={`${BASE_MAINNET.blockExplorerUrl}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base-accent hover:underline inline-flex items-center"
                          >
                            {formatAddress(tx.hash)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span>{formatAddress(tx.from)}</span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span>{formatAddress(tx.to)}</span>
                        </TableCell>
                        <TableCell>{formatEthBalance(tx.value)}</TableCell>
                        <TableCell>{formatDateTime(tx.timestamp)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              tx.status === "success"
                                ? "bg-green-100 text-green-800"
                                : tx.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletScanner;
