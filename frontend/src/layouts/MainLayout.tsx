import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ToastProvider } from '@/components/ui/Toast';

export const MainLayout: React.FC = () => {
  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa] dark:bg-[#0c0d0e] font-sans">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};
