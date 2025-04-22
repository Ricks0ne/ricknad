
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getWalletBalance, getWalletTransactions } from "@/utils/blockchain";
import { Transaction } from "@/types/blockchain";
import { MONAD_TESTNET } from "@/config/monad";

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
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.hash} className="p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Hash:</span>
                        <a 
                          href={`${MONAD_TESTNET.blockExplorerUrl}/tx/${tx.hash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate max-w-[200px]"
                        >
                          {tx.hash.substring(0, 10)}...
                        </a>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">From:</span>
                        <span className="truncate max-w-[200px]">{tx.from.substring(0, 10)}...</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">To:</span>
                        <span className="truncate max-w-[200px]">{tx.to.substring(0, 10)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Value:</span>
                        <span>{tx.value} MONAD</span>
                      </div>
                    </div>
                  ))}
                </div>
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
