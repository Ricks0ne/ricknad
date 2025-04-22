
import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-monad-secondary">
      <main className="flex-1 pr-64">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
      <Sidebar />
    </div>
  );
};

export default Layout;
