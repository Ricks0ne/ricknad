
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
    <div className="flex min-h-screen bg-monad-secondary relative">
      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? 'pl-6 pr-64' : 'w-full px-4'} animate-fade-in`}>
        <div className="container mx-auto py-6">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 right-4 z-50"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          
          {children}
        </div>
      </main>

      {/* Sidebar - now on the right side */}
      <div className={`
        ${isMobile ? 'fixed right-0 top-0 bottom-0 transition-transform duration-300 transform z-40' : 'fixed right-0 top-0 h-full'}
        ${isMobile && !isSidebarOpen ? 'translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
    </div>
  );
};

export default Layout;
