
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { getWalletBalance, getWalletTransactions, formatAddress } from "@/utils/blockchain";
import { Transaction } from "@/types/blockchain";
import { MONAD_TESTNET } from "@/config/monad";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const HomePage: React.FC = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get wallet balance
      const balance = await getWalletBalance(searchAddress);
      setWalletBalance(balance);
      
      // Get transactions
      const txs = await getWalletTransactions(searchAddress);
      setTransactions(txs);
    } catch (err) {
      console.error('Error searching address:', err);
      setError('Failed to fetch wallet data. Please check the address and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div>
      <div className="flex flex-col items-center justify-center text-center mb-12 pt-10">
        <h1 className="text-5xl font-bold text-monad-primary mb-4">Welcome To Monad Rick</h1>
        <p className="text-lg text-gray-600 italic">
          Generate Smart Contract Solidity code in seconds and ask AI Monad any question
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex gap-3">
          <Input
            placeholder="Search wallet address..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !searchAddress}
            className="bg-monad-primary hover:bg-monad-accent hover:text-black"
          >
            {isLoading ? 'Searching...' : <Search className="h-4 w-4 mr-2" />}
            {!isLoading && 'Search'}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>

      {walletBalance !== null && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Balance</CardTitle>
              <CardDescription>
                Address: {searchAddress}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{walletBalance} MONAD</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent transactions for this address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.hash}>
                        <TableCell>
                          <a 
                            href={`${MONAD_TESTNET.blockExplorerUrl}/tx/${tx.hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center"
                          >
                            {formatAddress(tx.hash)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </TableCell>
                        <TableCell>{formatAddress(tx.from)}</TableCell>
                        <TableCell>{formatAddress(tx.to)}</TableCell>
                        <TableCell>{tx.value} MONAD</TableCell>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : tx.status === 'failed' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!walletBalance && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Smart Contract Generator</CardTitle>
              <CardDescription>
                Use AI to generate, compile and deploy Solidity contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/contract-generator'}>
                Launch Generator
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Monad Explainer</CardTitle>
              <CardDescription>
                Ask questions about Monad and get AI-powered answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/explainer'}>
                Ask Monad
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HomePage;
