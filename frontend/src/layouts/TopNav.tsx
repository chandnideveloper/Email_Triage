import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  Check,
  Command,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface TopNavProps {
  onSearch?: (query: string) => void;
  onSyncComplete?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onSearch, onSyncComplete }) => {
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [isSyncing, setIsSyncing] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/inbox?search=${encodeURIComponent(searchValue.trim())}`);
      if (onSearch) onSearch(searchValue.trim());
    }
  };

  const handleSyncClick = async () => {
    try {
      setIsSyncing(true);
      toast.info('Sync Initiated', 'Checking Microsoft Graph delta tokens for new mail...');
      await api.triggerSync();
      toast.success('Mailbox Synced', 'All inbound messages are up to date.');
      if (onSyncComplete) onSyncComplete();
    } catch {
      toast.error('Sync Error', 'Failed to communicate with Microsoft Graph API.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-14 px-6 border-b border-zinc-200/80 bg-white/95 dark:border-zinc-800/80 dark:bg-[#0c0d0e]/95 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20">
      {/* Search Bar - Crisp, clean, minimal */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 lg:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search subjects, clients, amounts... (Press /)"
          className="w-full pl-8 pr-10 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 rounded-md outline-none transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-2xs">
          /
        </kbd>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* M365 Status Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Outlook 365 Connected</span>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200 transition active:scale-[0.98] disabled:opacity-50 shadow-2xs'
          )}
          title="Sync Mailbox"
        >
          <RefreshCw className={cn('w-3 h-3 text-zinc-500 dark:text-zinc-400', isSyncing && 'animate-spin')} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-850 transition"
            title="Activity log"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-3 text-xs z-50">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Mailbox Events</span>
                <span className="text-[10px] font-mono text-zinc-400">Live</span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-150 dark:border-zinc-800 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-200">Urgent BAS Amendment Needed</p>
                    <p className="text-[10px] text-zinc-500">Sydney Coastal Logistics Pty Ltd • 28 Nov</p>
                  </div>
                </div>
                <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-150 dark:border-zinc-800 flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-200">Invoice #INV-8831 Processed</p>
                    <p className="text-[10px] text-zinc-500">$115,500.00 • Thornton Group Trust</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-850 transition"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-zinc-300" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-semibold">
            AW
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              A. Wright
            </span>
            <span className="text-[10px] font-mono text-zinc-400 leading-tight">
              Partner
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
