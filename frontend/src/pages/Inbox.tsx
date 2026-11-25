import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle,
  Inbox as InboxIcon,
  Flame,
  AlertOctagon,
  Clock,
  ArrowUpDown,
  Mail,
  MailCheck,
  Tag,
  Paperclip,
  CheckSquare,
  Square,
  X,
  ChevronDown,
} from 'lucide-react';
import { EmailRecord, EmailCategory, Priority } from '@/types';
import { api } from '@/services/api';
import { EmailDetailView } from '@/components/inbox/EmailDetailView';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeTime } from '@/utils/formatters';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

const INBOX_CATEGORIES: EmailCategory[] = [
  'Invoice / Finance',
  'Client Communication',
  'Meeting / Scheduling',
  'Technical Issue',
  'Information / FYI',
  'Follow-up Required',
  'Spam / Unwanted',
  'Other',
];

export const Inbox: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    searchParams.get('id') || null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkCategoryMenu, setShowBulkCategoryMenu] = useState(false);

  // Counters for left sub-navigation
  const [counts, setCounts] = useState({
    total: 0,
    critical: 0,
    action: 0,
    unread: 0,
    categories: {} as Record<string, number>,
  });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [selectedPriority, setSelectedPriority] = useState<string>(searchParams.get('priority') || 'all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>(
    (searchParams.get('read') as any) || 'all'
  );
  const [actionOnly, setActionOnly] = useState<boolean>(searchParams.get('action') === 'true');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  const loadEmails = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      // Fetch unfiltered emails to compute live badges and counts
      const allRes = await api.getEmails({});
      const raw = allRes.items;
      const cats: Record<string, number> = {};
      raw.forEach((e) => {
        const c = e.triage?.category || 'Other';
        cats[c] = (cats[c] || 0) + 1;
      });
      setCounts({
        total: raw.length,
        critical: raw.filter((e) => e.triage?.priority === 'Critical').length,
        action: raw.filter((e) => e.triage?.action_required).length,
        unread: raw.filter((e) => !e.is_read).length,
        categories: cats,
      });

      // Now fetch filtered list
      const res = await api.getEmails({
        search,
        category: selectedCategory,
        priority: selectedPriority,
        readFilter,
        actionRequired: actionOnly ? true : null,
        sortBy,
      });
      setEmails(res.items);

      if (res.items.length > 0) {
        setSelectedEmailId((prevId) => {
          if (prevId && res.items.some((e) => e.internal_id === prevId)) {
            return prevId;
          }
          const idFromUrl = searchParams.get('id');
          const match = idFromUrl ? res.items.find((e) => e.internal_id === idFromUrl) : null;
          return match ? match.internal_id : res.items[0].internal_id;
        });
      } else {
        setSelectedEmailId(null);
      }
    } catch {
      if (!isBackground) {
        toast.error('Failed to load emails');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Periodic background sync from Microsoft Graph (every 10s for fast email intake)
  useEffect(() => {
    const runSync = async () => {
      try {
        await api.triggerSync();
        loadEmails(true);
      } catch (err) {
        console.debug('Background sync skipped/failed:', err);
      }
    };

    const syncInterval = setInterval(runSync, 10000);
    return () => clearInterval(syncInterval);
  }, []);

  // Fast-poll inbox when any email is being actively analyzed by AI
  useEffect(() => {
    const hasAnalyzing = emails.some(
      (e) => e.processing_status === 'PENDING' || e.processing_status === 'INGESTED' || e.processing_status === 'RETRYING'
    );
    if (!hasAnalyzing) return;

    const fastPoll = setInterval(() => {
      loadEmails(true);
    }, 2000);

    return () => clearInterval(fastPoll);
  }, [emails]);

  useEffect(() => {
    loadEmails(emails.length > 0);
    const handleUpdate = () => loadEmails(true);
    window.addEventListener('triage_updated', handleUpdate);
    const interval = setInterval(() => loadEmails(true), 12000);
    return () => {
      window.removeEventListener('triage_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [search, selectedCategory, selectedPriority, readFilter, actionOnly, sortBy]);

  // Synchronize state bidirectionally with URL
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || 'all');
    setSelectedPriority(searchParams.get('priority') || 'all');
    setReadFilter((searchParams.get('read') as any) || 'all');
    setActionOnly(searchParams.get('action') === 'true');
    setSearch(searchParams.get('search') || '');
    const id = searchParams.get('id');
    if (id) setSelectedEmailId(id);
  }, [searchParams]);

  const handleSelectAllMail = () => {
    setSearchParams({});
  };

  const handleTogglePriority = (priority: string) => {
    const next = new URLSearchParams(searchParams);
    if (selectedPriority === priority) {
      next.delete('priority');
    } else {
      next.set('priority', priority);
      next.delete('category');
    }
    setSearchParams(next);
  };

  const handleToggleActionOnly = () => {
    const next = new URLSearchParams(searchParams);
    if (actionOnly) {
      next.delete('action');
    } else {
      next.set('action', 'true');
    }
    setSearchParams(next);
  };

  const handleReadFilterChange = (val: 'all' | 'unread' | 'read') => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') {
      next.delete('read');
    } else {
      next.set('read', val);
    }
    setSearchParams(next);
  };

  const handleCategorySelect = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (selectedCategory === cat) {
      next.delete('category');
    } else {
      next.set('category', cat);
      next.delete('priority');
    }
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.internal_id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  const handleSelectAll = () => {
    if (selectedIds.length === emails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map((e) => e.internal_id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedIds.length === 0) return;
    const targetIds = [...selectedIds];
    setEmails((prev) =>
      prev.map((e) => (targetIds.includes(e.internal_id) ? { ...e, is_read: isRead } : e))
    );
    setSelectedIds([]);
    await api.markRead(targetIds, isRead);
    toast.success(`Marked ${targetIds.length} email(s) as ${isRead ? 'read' : 'unread'}`);
    loadEmails(true);
  };

  const handleBulkMarkCompleted = async () => {
    if (selectedIds.length === 0) return;
    const targetIds = [...selectedIds];
    setEmails((prev) =>
      prev.map((e) =>
        targetIds.includes(e.internal_id)
          ? {
              ...e,
              is_read: true,
              processing_status: 'COMPLETED' as any,
              triage: { ...e.triage, action_required: false, response_required: false, follow_up_required: false },
            }
          : e
      )
    );
    setSelectedIds([]);
    await api.markCompleted(targetIds);
    toast.success(`Resolved ${targetIds.length} email(s)`);
    loadEmails(true);
  };

  const handleBulkCategorize = async (cat: EmailCategory) => {
    if (selectedIds.length === 0) return;
    const targetIds = [...selectedIds];
    setEmails((prev) =>
      prev.map((e) =>
        targetIds.includes(e.internal_id)
          ? { ...e, triage: { ...e.triage, category: cat } }
          : e
      )
    );
    setShowBulkCategoryMenu(false);
    setSelectedIds([]);
    await api.updateCategory(targetIds, cat);
    toast.success(`Updated category to "${cat}" for ${targetIds.length} email(s)`);
    loadEmails(true);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#FFFFFF]">
      {/* COLUMN 1: Left Inbox Filters (220px) */}
      <div className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-[#E3E9ED] bg-[#F5F7F8] p-3 overflow-y-auto select-none">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-semibold tracking-wider text-[#687786] uppercase font-mono">
            Inbox Views
          </span>
          {(selectedCategory !== 'all' || selectedPriority !== 'all' || actionOnly || readFilter !== 'all') && (
            <button
              onClick={handleReset}
              className="text-[10px] text-[#16877A] font-medium hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Primary Views */}
        <div className="space-y-0.5 mb-4">
          <button
            onClick={handleSelectAllMail}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
              selectedCategory === 'all' && selectedPriority === 'all' && !actionOnly && readFilter === 'all'
                ? 'bg-[#E3E9ED] text-[#172B3A] font-semibold'
                : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
            )}
          >
            <span className="flex items-center gap-2">
              <InboxIcon className="w-3.5 h-3.5 text-[#16877A]" /> All Mail
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#687786] font-medium border border-[#E3E9ED]">
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => handleTogglePriority('Critical')}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
              selectedPriority === 'Critical'
                ? 'bg-[#FBECEE] text-[#C94F56] font-semibold border border-[#F7D3D6]'
                : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
            )}
          >
            <span className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-[#C94F56]" /> Critical / P1
            </span>
            {counts.critical > 0 && (
              <span className="text-[10px] font-mono text-[#C94F56] bg-[#FFFFFF] border border-[#F7D3D6] px-1.5 py-0.2 rounded font-semibold">
                {counts.critical}
              </span>
            )}
          </button>

          <button
            onClick={handleToggleActionOnly}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
              actionOnly
                ? 'bg-[#FBF3E6] text-[#D99A38] font-semibold border border-[#F5E0C2]'
                : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
            )}
          >
            <span className="flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-[#D99A38]" /> Action Required
            </span>
            {counts.action > 0 && (
              <span className="text-[10px] font-mono text-[#D99A38] bg-[#FFFFFF] border border-[#F5E0C2] px-1.5 py-0.2 rounded font-semibold">
                {counts.action}
              </span>
            )}
          </button>
        </div>

        {/* Read State Selector */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1.5 px-1">
            Read State
          </span>
          <div className="flex bg-[#E3E9ED] p-0.5 rounded text-xs font-mono">
            <button
              onClick={() => handleReadFilterChange('all')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer',
                readFilter === 'all'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              All
            </button>
            <button
              onClick={() => handleReadFilterChange('unread')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer',
                readFilter === 'unread'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              Unread
            </button>
            <button
              onClick={() => handleReadFilterChange('read')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer',
                readFilter === 'read'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              Read
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1.5 px-1">
            Categories
          </span>
          <div className="space-y-0.5">
            {INBOX_CATEGORIES.map((cat) => {
              const count = counts.categories[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded text-xs truncate transition flex items-center justify-between cursor-pointer',
                    selectedCategory === cat
                      ? 'bg-[#E3E9ED] text-[#172B3A] font-semibold'
                      : 'text-[#687786] hover:bg-[#E3E9ED]/50 hover:text-[#202B35]'
                  )}
                >
                  <span className="truncate">{cat}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#687786] border border-[#E3E9ED] font-medium ml-1">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Middle Email List (350px) */}
      <div
        className={cn(
          'flex flex-col border-r border-[#E3E9ED] bg-[#FFFFFF]',
          selectedEmail ? 'hidden md:flex md:w-[350px] shrink-0' : 'flex-1 md:w-[350px] md:flex-initial shrink-0'
        )}
      >
        {/* Email List Header */}
        <div className="p-3 border-b border-[#E3E9ED] bg-[#F5F7F8] space-y-2 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#172B3A]">Inbox</h2>
              <span className="text-[11px] font-mono px-1.5 py-0.2 font-medium bg-[#FFFFFF] border border-[#E3E9ED] text-[#16877A] rounded">
                {emails.length}
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-[#687786] bg-[#FFFFFF] border border-[#E3E9ED] px-2 py-1 rounded">
              <ArrowUpDown className="w-3 h-3 text-[#16877A]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium outline-none cursor-pointer text-[#202B35] text-xs"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#687786]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list..."
              className="w-full pl-8 pr-4 py-1 text-xs bg-[#FFFFFF] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] placeholder:text-[#687786]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#687786] hover:text-[#202B35]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {emails.length > 0 && (
          <div className="px-3 py-1.5 border-b border-[#E3E9ED] bg-[#F5F7F8] flex items-center justify-between text-xs text-[#687786]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-[#687786] hover:text-[#202B35] flex items-center gap-1.5 cursor-pointer"
              >
                {selectedIds.length === emails.length && emails.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#16877A]" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">Select all</span>
              </button>
              {selectedIds.length > 0 && (
                <span className="text-[10px] font-mono font-medium text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-1.5 py-0.2 rounded">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBulkMarkRead(true)}
                  className="p-1 hover:bg-[#E3E9ED] rounded text-[#202B35]"
                  title="Mark read"
                >
                  <MailCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleBulkMarkCompleted}
                  className="p-1 hover:bg-[#E3E9ED] rounded text-[#16877A]"
                  title="Mark resolved"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowBulkCategoryMenu(!showBulkCategoryMenu)}
                    className="p-1 hover:bg-[#E3E9ED] rounded text-[#202B35]"
                    title="Change category"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  {showBulkCategoryMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-[#FFFFFF] border border-[#E3E9ED] rounded shadow-md z-30 py-1 text-xs">
                      {INBOX_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleBulkCategorize(cat)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] text-[#202B35] truncate"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E3E9ED]">
          {loading && emails.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-18 bg-[#F5F7F8] rounded animate-pulse" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                icon={InboxIcon}
                title="No emails match your filter"
                description="Try clearing search or filters to see all messages."
                action={
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium text-[#16877A] border border-[#16877A]/40 rounded hover:bg-[#E8F4F1] transition"
                  >
                    Clear Filters
                  </button>
                }
              />
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = selectedEmailId === email.internal_id;
              const isChecked = selectedIds.includes(email.internal_id);

              return (
                <div
                  key={email.internal_id}
                  onClick={() => {
                    setSelectedEmailId(email.internal_id);
                    const next = new URLSearchParams(searchParams);
                    next.set('id', email.internal_id);
                    setSearchParams(next);
                  }}
                  className={cn(
                    'p-3 cursor-pointer transition select-none relative group',
                    isSelected
                      ? 'bg-[#EDF3F8]/60 border-l-[3px] border-[#16877A]'
                      : 'hover:bg-[#F5F7F8] border-l-[3px] border-transparent',
                    !email.is_read && 'bg-[#FFFFFF]'
                  )}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        onClick={(e) => handleToggleSelect(email.internal_id, e)}
                        className="text-[#687786] hover:text-[#202B35] shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#16877A]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#B0BEC7]" />
                        )}
                      </button>

                      {/* Unread Indicator */}
                      {!email.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#16877A] shrink-0" />
                      )}

                      <span
                        className={cn(
                          'text-xs truncate',
                          !email.is_read ? 'font-semibold text-[#172B3A]' : 'font-medium text-[#202B35]'
                        )}
                      >
                        {email.sender_name}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#687786] shrink-0">
                      {formatRelativeTime(email.received_at)}
                    </span>
                  </div>

                  <p
                    className={cn(
                      'text-xs truncate mb-1 pl-5',
                      !email.is_read ? 'font-semibold text-[#172B3A]' : 'text-[#202B35]'
                    )}
                  >
                    {email.subject}
                  </p>

                  <p className="text-[11px] text-[#687786] line-clamp-1 mb-2 pl-5">
                    {email.triage?.summary || email.body_plain}
                  </p>

                  <div className="flex items-center gap-1.5 pl-5">
                    <PriorityBadge priority={email.triage?.priority || 'Low'} size="sm" />
                    <CategoryBadge category={email.triage?.category || 'Other'} size="sm" />
                    {email.has_attachments && (
                      <span className="text-[10px] text-[#687786] flex items-center gap-0.5 ml-auto font-mono">
                        <Paperclip className="w-3 h-3 text-[#687786]" />
                        {email.attachments.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: Right Email Detail Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF] overflow-hidden">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmailId(null)}
            onToggleRead={async (id, isRead) => {
              setEmails((prev) =>
                prev.map((e) => (e.internal_id === id ? { ...e, is_read: isRead } : e))
              );
              await api.markRead([id], isRead);
              loadEmails(true);
            }}
            onMarkCompleted={async (id) => {
              setEmails((prev) =>
                prev.map((e) =>
                  e.internal_id === id
                    ? {
                        ...e,
                        is_read: true,
                        processing_status: 'COMPLETED' as any,
                        triage: { ...e.triage, action_required: false, response_required: false, follow_up_required: false },
                      }
                    : e
                )
              );
              await api.markCompleted([id]);
              toast.success('Marked Resolved');
              loadEmails(true);
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center bg-[#F5F7F8]">
            <EmptyState
              icon={InboxIcon}
              title="No email selected"
              description="Select an email from the inbox list to review its AI classification, extracted financial data, and compliance details."
            />
          </div>
        )}
      </div>
    </div>
  );
};
