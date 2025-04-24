
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

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? 'pr-64' : 'w-full'}`}>
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed right-0 top-0 bottom-0 transition-transform duration-300 transform z-40' : ''}
        ${isMobile && !isSidebarOpen ? 'translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
    </div>
  );
};

export default Layout;
