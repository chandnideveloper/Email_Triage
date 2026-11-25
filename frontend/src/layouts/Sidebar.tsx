import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await api.getEmails({});
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
    const timer = setInterval(fetchCount, 15000);
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
    },
    {
      to: '/documents',
      label: 'Documents',
      icon: FileText,
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
        'relative flex flex-col bg-[#172B3A] text-[#9AA8B4] border-r border-[#12222E] transition-all duration-200 ease-in-out z-30 select-none shrink-0',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-4 h-[54px] border-b border-[#1E374A]/80">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-[#16877A] text-white shrink-0 shadow-xs">
          <Shield className="w-4 h-4 text-white" />
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm tracking-tight text-white truncate">
              Email Triage
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 text-[#16877A] bg-[#16877A]/15 border border-[#16877A]/30 rounded">
              v2.0
            </span>
          </div>
        )}
      </div>

      {/* Navigation Section */}
      <div className="flex-1 px-2.5 py-3.5 space-y-1 overflow-y-auto">
        <div className={cn('px-2 mb-2', collapsed && 'hidden')}>
          <span className="text-[10px] font-mono font-semibold tracking-wider text-[#687786] uppercase">
            Platform
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#1E374A] text-white shadow-2xs'
                    : 'text-[#9AA8B4] hover:text-white hover:bg-[#1E374A]/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Slim active teal indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#16877A] rounded-r" />
                  )}

                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#16877A]' : 'text-[#7D8F9E] group-hover:text-white'
                    )}
                  />

                  {!collapsed && (
                    <span className="truncate flex-1 text-[13px]">{item.label}</span>
                  )}

                  {!collapsed && item.badge !== null && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded bg-[#16877A] text-white">
                      {item.badge}
                    </span>
                  )}

                  {collapsed && item.badge !== null && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#16877A]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Status & Mailbox Info */}
      <div className="p-3 border-t border-[#1E374A]/80 bg-[#12222E]/50 space-y-2.5">
        {!collapsed ? (
          <>
            {/* Connection badge */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#172B3A] border border-[#1E374A]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#16877A] shrink-0" />
                <span className="text-[11px] font-medium text-white truncate">Microsoft 365</span>
              </div>
              <span className="text-[10px] text-[#16877A] font-mono font-medium">Connected</span>
            </div>

            {/* Target Mailbox */}
            <div className="px-2">
              <span className="text-[10px] text-[#687786] block font-mono">Connected Mailbox</span>
              <span className="text-[11px] text-[#9AA8B4] font-mono truncate block" title="ibex.triage@aoscaustralia.com">
                ibex.triage@aoscaustralia.com
              </span>
            </div>

            {/* User Profile */}
            <div className="pt-2 border-t border-[#1E374A]/60 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-[#1E374A] border border-[#2B475D] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'IT'}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-white truncate leading-tight">
                    {user?.name || 'Ibex Triage Admin'}
                  </div>
                  <div className="text-[10px] text-[#687786] truncate">
                    Enterprise Admin
                  </div>
                </div>
              </div>

              {/* Collapse Button */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded text-[#687786] hover:text-white hover:bg-[#1E374A] transition cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#16877A]" title="Microsoft 365 Connected" />
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded text-[#687786] hover:text-white hover:bg-[#1E374A] transition cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
