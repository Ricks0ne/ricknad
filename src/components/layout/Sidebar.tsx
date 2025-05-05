
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  Database, 
  MessageSquare,
  Link as LinkIcon, 
  Wallet as WalletIcon,
  ExternalLink,
  X,
  FileCode,
  Twitter
} from 'lucide-react';
import { useWeb3 } from '../web3/Web3Provider';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/utils/blockchain';
import { MONAD_TESTNET } from '@/config/monad';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const { account, connectWallet, disconnectWallet, isConnected, isConnecting } = useWeb3();
  const isMobile = useIsMobile();

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
      name: 'Resources',
      path: '/resources',
      icon: <LinkIcon className="h-5 w-5" />,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bg-monad-dark text-monad-light h-screen w-64 flex flex-col py-6 shadow-lg overflow-y-auto">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:text-monad-accent"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      <div className="px-4 mb-8">
        <h2 className="text-2xl font-bold text-monad-accent font-grotesk">Ricknad</h2>
        <p className="text-xs text-gray-400 mt-1">Generate smart contracts & ask Monad AI anything</p>
        <div className="flex items-center mt-2">
          <FileCode className="h-4 w-4 mr-2 text-monad-accent" />
          <p className="text-sm text-gray-400">Monad Smart Contracts</p>
        </div>
      </div>

      <div className="px-4 mb-6">
        {isConnected && account ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-xl">
              <WalletIcon className="h-4 w-4 text-monad-accent" />
              <span className="text-sm truncate">{formatAddress(account)}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-monad-accent text-monad-accent hover:bg-monad-accent hover:text-black transition-colors"
              onClick={disconnectWallet}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black transition-colors rounded-xl"
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
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors",
                  isActive(item.path)
                    ? "bg-monad-primary text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-monad-accent"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-gray-800">
        <div className="text-sm text-gray-400 mb-1">Monad Testnet</div>
        <div className="text-xs text-gray-500 mb-2">
          Chain ID: {MONAD_TESTNET.chainId}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-monad-accent/30 text-monad-accent mb-4 rounded-xl"
          asChild
        >
          <a href="https://faucet.monad.xyz/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-2" />
            Get Testnet Tokens
          </a>
        </Button>
        
        <a 
          href="https://x.com/0xFred_" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center text-xs text-gray-400 hover:text-monad-accent transition-colors"
        >
          <Twitter className="h-3 w-3 mr-1" />
          Follow me on X: @0xFred_
        </a>
      </div>
    </div>
  );
};

export default Sidebar;
