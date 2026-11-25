import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Bell,
  Check,
  CheckCircle2,
  Mail,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/formatters';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { cn } from '@/utils/cn';

interface TopNavProps {
  onSearch?: (query: string) => void;
  onSyncComplete?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onSearch, onSyncComplete }) => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isSyncing, setIsSyncing] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await api.getEmails({});
      const items = res.items || [];
      setRecentEvents(items.slice(0, 6));
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('triage_updated', handleUpdate);
    return () => window.removeEventListener('triage_updated', handleUpdate);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

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
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast.success('Mailbox Synced', 'All inbound messages are up to date.');
      loadNotifications();
      if (onSyncComplete) onSyncComplete();
    } catch {
      toast.error('Sync Error', 'Failed to communicate with Microsoft Graph API.');
    } finally {
      setIsSyncing(false);
    }
  };

  const unreadCount = recentEvents.filter((e) => !e.is_read).length;
  const criticalCount = recentEvents.filter((e) => e.triage?.priority === 'Critical').length;

  return (
    <header className="h-[54px] px-5 border-b border-[#E3E9ED] bg-[#FFFFFF] flex items-center justify-between sticky top-0 z-20 shrink-0 select-none">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#687786]" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search subjects, clients, amounts... (Press /)"
          className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-[#F5F7F8] border border-[#E3E9ED] focus:border-[#16877A] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#16877A] rounded outline-none transition text-[#202B35] placeholder:text-[#687786]"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#687786] bg-[#FFFFFF] border border-[#E3E9ED] px-1 py-0.2 rounded">
          /
        </kbd>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Microsoft 365 Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
          <span className="w-2 h-2 rounded-full bg-[#16877A]" />
          <span className="text-xs text-[#202B35] font-medium">Outlook 365 Connected</span>
          <span className="text-[10px] text-[#687786] font-mono pl-1 border-l border-[#E3E9ED]">
            Sync: {lastSyncTime}
          </span>
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#202B35] bg-[#FFFFFF] hover:bg-[#F5F7F8] border border-[#E3E9ED] hover:border-[#B0BEC7] rounded transition cursor-pointer disabled:opacity-60"
          title="Trigger manual delta check against Microsoft Graph"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-[#16877A]', isSyncing && 'animate-spin')} />
          <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {/* Real-time Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded hover:bg-[#F5F7F8] text-[#687786] hover:text-[#202B35] border border-transparent hover:border-[#E3E9ED] transition cursor-pointer"
            title="Recent Notifications & Mailbox Events"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C94F56] ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-88 bg-[#FFFFFF] border border-[#E3E9ED] rounded-lg shadow-lg z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 border-b border-[#E3E9ED] flex items-center justify-between bg-[#F5F7F8]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#172B3A] text-xs">Recent Mailbox Events</span>
                  {criticalCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-[#FBECEE] text-[#C94F56] border border-[#F7D3D6]">
                      {criticalCount} Critical
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#16877A] font-mono font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16877A]" /> Live
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#E3E9ED]">
                {recentEvents.length === 0 ? (
                  <div className="p-4 text-center text-[#687786] italic text-xs">
                    No recent events detected.
                  </div>
                ) : (
                  recentEvents.map((email) => (
                    <div
                      key={email.internal_id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(`/inbox?id=${email.internal_id}`);
                      }}
                      className={cn(
                        'p-3 hover:bg-[#F5F7F8] cursor-pointer transition flex items-start gap-2.5',
                        !email.is_read && 'bg-[#EDF3F8]/40'
                      )}
                    >
                      <div className="pt-0.5 shrink-0">
                        {email.triage?.priority === 'Critical' ? (
                          <span className="w-2 h-2 rounded-full bg-[#C94F56] inline-block" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#16877A] inline-block" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="font-medium text-[#202B35] truncate text-xs">
                            {email.subject}
                          </p>
                          <span className="text-[10px] font-mono text-[#687786] shrink-0">
                            {formatRelativeTime(email.received_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#687786] truncate">
                          {email.sender_name} • {email.triage?.category || 'Invoice / Finance'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[#E3E9ED] bg-[#F5F7F8] text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/inbox');
                  }}
                  className="text-[11px] font-medium text-[#16877A] hover:underline"
                >
                  View all in Inbox →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Admin Badge */}
        <div className="pl-2 border-l border-[#E3E9ED] flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#172B3A] text-white flex items-center justify-center text-xs font-semibold">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'IT'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-[#202B35] leading-none">
              {user?.name || 'Ibex Triage Admin'}
            </div>
            <div className="text-[10px] text-[#687786] mt-0.5">
              Enterprise Administrator
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
