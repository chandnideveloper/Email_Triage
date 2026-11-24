import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Flame,
  AlertOctagon,
  Clock,
  Paperclip,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface SidebarProps {
  unreadCount?: number;
  actionCount?: number;
  criticalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadCount = 3,
  actionCount = 4,
  criticalCount = 1,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
      to: '/inbox?priority=Critical',
      label: 'Priority',
      icon: Flame,
      badge: criticalCount > 0 ? criticalCount : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      to: '/inbox?action=true',
      label: 'Action Required',
      icon: AlertOctagon,
      badge: actionCount > 0 ? actionCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    {
      to: '/inbox?category=Follow-up+Required',
      label: 'Follow-ups',
      icon: Clock,
      badge: null,
    },
    {
      to: '/attachments',
      label: 'Documents',
      icon: Paperclip,
      badge: null,
    },
    {
      to: '/analytics',
      label: 'Performance',
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
        'relative flex flex-col border-r border-[#1e2025] bg-[#0c0d0e] text-zinc-300 transition-all duration-200 ease-out z-30 select-none',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[#1c1e22]">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-900 border border-zinc-750 text-white shrink-0 shadow-xs">
          <Mail className="w-3.5 h-3.5 text-zinc-200" />
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Triage
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 text-zinc-400 bg-zinc-850 border border-zinc-800 rounded">
              v2.0
            </span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        <div className="mb-1.5 px-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          {!collapsed ? 'Navigation' : '••'}
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
                'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors relative',
                isActive
                  ? 'bg-zinc-850 text-white shadow-2xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
              />

              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}

              {!collapsed && item.badge !== null && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] font-mono rounded font-medium',
                    item.badgeColor || 'bg-zinc-800 text-zinc-400'
                  )}
                >
                  {item.badge}
                </span>
              )}

              {collapsed && item.badge !== null && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-400" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* M365 Status in footer */}
      {!collapsed ? (
        <div className="p-2.5 mx-2.5 mb-2.5 rounded-md bg-zinc-900/70 border border-zinc-850 text-[11px]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-zinc-300">Microsoft 365</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sync active
            </span>
          </div>
          <p className="text-[10px] font-mono text-zinc-500 truncate">triage@yourpractice.com.au</p>
        </div>
      ) : (
        <div className="flex justify-center mb-2.5" title="M365 Connected">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-[#1c1e22] flex items-center justify-between">
        {!collapsed && (
          <span className="text-[11px] text-zinc-500 pl-2">Toggle sidebar</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-850 transition',
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
