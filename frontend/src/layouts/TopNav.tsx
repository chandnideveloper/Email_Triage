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
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface TopNavProps {
  onSearch?: (query: string) => void;
  onSyncComplete?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onSearch, onSyncComplete }) => {
  const { user, logout } = useAuth();
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
    <header className="h-14 px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Search Bar - Crisp, clean, modern */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 lg:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search subjects, clients, amounts... (Press /)"
          className="w-full pl-8 pr-10 py-1.5 text-xs bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none transition text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
          /
        </kbd>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* M365 Status Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
          <span>Outlook 365 Connected</span>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition active:scale-[0.98] disabled:opacity-50 shadow-2xs cursor-pointer'
          )}
          title="Sync Mailbox"
        >
          <RefreshCw className={cn('w-3 h-3 text-indigo-500 dark:text-indigo-400', isSyncing && 'animate-spin')} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Activity log"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-[#0B0F19]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3.5 text-xs z-50">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Recent Mailbox Events</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">Live</span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200">Urgent BAS Amendment Needed</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Sydney Coastal Logistics Pty Ltd • 28 Nov</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200">Invoice #INV-8831 Processed</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">$115,500.00 • Thornton Group Trust</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Profile Avatar & Logout */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-indigo-500/20 ring-1 ring-white/20">
            {user?.avatarInitials || 'AW'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.name || 'A. Wright'}
            </span>
            <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 font-semibold leading-tight">
              {user?.role || 'Partner'}
            </span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-1.5 ml-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
            title="Sign out of Triage"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
