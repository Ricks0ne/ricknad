
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  Database, 
  FileCode, 
  Link as LinkIcon, 
  Wallet as WalletIcon, 
  Search,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/utils/blockchain';
import { MONAD_TESTNET } from '@/config/monad';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { account, connectWallet, disconnectWallet, isConnected, isConnecting } = useWeb3();

  const navItems = [
    {
      name: 'Home',
      path: '/',
      icon: <Database className="h-5 w-5" />,
    },
    {
      name: 'Monad AI Chat',
      path: '/chat',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      name: 'Contract Generator',
      path: '/contract-generator',
      icon: <FileCode className="h-5 w-5" />,
    },
    {
      name: 'Monad Explainer',
      path: '/explainer',
      icon: <Search className="h-5 w-5" />,
    },
    {
      name: 'Resources',
      path: '/resources',
      icon: <LinkIcon className="h-5 w-5" />,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="bg-monad-dark text-monad-light h-screen w-64 fixed right-0 flex flex-col py-6 shadow-lg overflow-y-auto">
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-bold text-monad-accent">Ricknad</h2>
        <p className="text-sm text-gray-400">Monad Testnet Explorer</p>
      </div>

      <div className="px-4 mb-6">
        {isConnected && account ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-md">
              <WalletIcon className="h-4 w-4 text-monad-accent" />
              <span className="text-sm truncate">{formatAddress(account)}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-monad-accent text-monad-accent hover:bg-monad-accent hover:text-black"
              onClick={disconnectWallet}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </div>

      <nav className="flex-1">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-md transition-colors",
                  isActive(item.path)
                    ? "bg-monad-primary text-white"
                    : "text-gray-300 hover:bg-gray-800"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto px-4">
        <div className="text-sm text-gray-400 mb-1">Monad Testnet</div>
        <div className="text-xs text-gray-500">
          Chain ID: {MONAD_TESTNET.chainId}
        </div>
        <a 
          href="https://x.com/0xFred_" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center text-sm text-white hover:text-monad-accent mt-4 transition-colors"
        >
          Follow me on X: @0xFred_ <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export default Sidebar;
