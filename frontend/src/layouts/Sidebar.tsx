import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Paperclip,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await api.getEmails();
        if (mounted) {
          const unread = res.items.filter((e) => !e.is_read).length;
          setUnreadCount(unread);
        }
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };
    fetchCount();
    window.addEventListener('storage', fetchCount);
    window.addEventListener('triage_updated', fetchCount);
    const timer = setInterval(fetchCount, 6000);
    return () => {
      mounted = false;
      window.removeEventListener('storage', fetchCount);
      window.removeEventListener('triage_updated', fetchCount);
      clearInterval(timer);
    };
  }, []);

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/inbox',
      label: 'Inbox',
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-zinc-800 text-zinc-200 dark:bg-zinc-700 dark:text-zinc-100',
    },
    {
      to: '/attachments',
      label: 'Documents',
      icon: Paperclip,
      badge: null,
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-800/80 bg-[#0B0F19] text-slate-300 transition-all duration-200 ease-out z-30 select-none shadow-xl',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800/70 bg-gradient-to-r from-[#0B0F19] to-[#0E1524]">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shrink-0 shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
          <Mail className="w-3.5 h-3.5 text-white" />
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Email Triage
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-md">
              v2.0
            </span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-2.5 py-3.5 space-y-1 overflow-y-auto">
        <div className="mb-2 px-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          {!collapsed ? 'Workspace' : '••'}
        </div>

        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : item.to.includes('?')
              ? location.pathname + location.search === item.to
              : location.pathname.startsWith(item.to) && !location.search;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all relative',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white font-semibold border-l-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />

              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}

              {!collapsed && item.badge !== null && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-mono rounded-full font-bold shadow-xs',
                    item.badgeColor || 'bg-indigo-600 text-white'
                  )}
                >
                  {item.badge}
                </span>
              )}

              {collapsed && item.badge !== null && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0B0F19]" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* M365 Status in footer */}
      {!collapsed ? (
        <div className="p-3 mx-2.5 mb-2.5 rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 text-[11px] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
              Microsoft 365
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Connected
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 truncate hover:text-slate-200 transition" title="ibex.triage@aoscaustralia.com">
            ibex.triage@aoscaustralia.com
          </p>
        </div>
      ) : (
        <div className="flex justify-center mb-2.5" title="M365 Connected: ibex.triage@aoscaustralia.com">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800/70 flex items-center justify-between bg-slate-950/40">
        {!collapsed && (
          <span className="text-[11px] text-slate-500 pl-2 font-medium">Collapse sidebar</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition',
            collapsed && 'w-full flex justify-center'
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
