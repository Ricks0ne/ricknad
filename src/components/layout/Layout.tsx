
import React from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-monad-dark relative">
      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? 'pr-64' : 'w-full'} px-4 py-6 animate-fade-in`}>
        <div className="container mx-auto">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="dark"
              size="icon"
              className="fixed top-4 right-4 z-50"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5 text-white" />
            </Button>
          )}
          
          {children}
        </div>
      </main>

      {/* Sidebar - on the right side */}
      <div className={`
        ${isMobile ? 'fixed right-0 top-0 bottom-0 transition-all duration-300 transform z-40' : 'fixed right-0 top-0 h-full'}
        ${isMobile && !isSidebarOpen ? 'translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
    </div>
  );
};

export default Layout;
