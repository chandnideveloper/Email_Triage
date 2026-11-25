import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckSquare,
  Square,
  MailCheck,
  Mail,
  CheckCircle2,
  Paperclip,
  ArrowUpDown,
  Inbox as InboxIcon,
  Flame,
  AlertOctagon,
  Clock,
  Tag,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { EmailCategory, EmailRecord } from '@/types';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { EmailDetailView } from '@/components/inbox/EmailDetailView';
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
  const [loading, setLoading] = useState(true);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkCategoryMenu, setShowBulkCategoryMenu] = useState(false);
  const [counts, setCounts] = useState({
    total: 0,
    critical: 0,
    action: 0,
    unread: 0,
    categories: {} as Record<string, number>,
  });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedPriority, setSelectedPriority] = useState<string>(searchParams.get('priority') || 'all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>(
    (searchParams.get('read') as any) || 'all'
  );
  const [actionOnly, setActionOnly] = useState<boolean>(searchParams.get('action') === 'true');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  const loadEmails = async () => {
    try {
      setLoading(true);
      // Fetch unfiltered emails to compute live badges and counts
      const allRes = await api.getEmails({});
      const raw = allRes.items;
      const cats: Record<string, number> = {};
      raw.forEach((e) => {
        cats[e.triage.category] = (cats[e.triage.category] || 0) + 1;
      });
      setCounts({
        total: raw.length,
        critical: raw.filter((e) => e.triage.priority === 'Critical').length,
        action: raw.filter((e) => e.triage.action_required).length,
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
        const idFromUrl = searchParams.get('id');
        const match = res.items.find((e) => e.internal_id === idFromUrl);
        setSelectedEmailId(match ? match.internal_id : res.items[0].internal_id);
      } else {
        setSelectedEmailId(null);
      }
    } catch {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  // Periodic background sync from Microsoft Graph
  useEffect(() => {
    const runSync = async () => {
      try {
        await api.triggerSync();
        loadEmails();
      } catch (err) {
        console.debug('Background sync skipped/failed:', err);
      }
    };

    // Run on initial page load
    runSync();

    // Auto-sync from M365 every 20 seconds
    const syncInterval = setInterval(runSync, 20000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    loadEmails();
    const handleUpdate = () => loadEmails();
    window.addEventListener('triage_updated', handleUpdate);
    const interval = setInterval(loadEmails, 8000);
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
    await api.markRead(selectedIds, isRead);
    toast.success(`Marked ${selectedIds.length} email(s) as ${isRead ? 'read' : 'unread'}`);
    setSelectedIds([]);
    loadEmails();
  };

  const handleBulkMarkCompleted = async () => {
    if (selectedIds.length === 0) return;
    await api.markCompleted(selectedIds);
    toast.success(`Resolved ${selectedIds.length} email(s)`);
    setSelectedIds([]);
    loadEmails();
  };

  const handleBulkCategorize = async (cat: EmailCategory) => {
    if (selectedIds.length === 0) return;
    await api.updateCategory(selectedIds, cat);
    toast.success(`Updated category to "${cat}" for ${selectedIds.length} email(s)`);
    setShowBulkCategoryMenu(false);
    setSelectedIds([]);
    loadEmails();
  };

  const handleToggleSingleRead = async (id: string, isRead: boolean) => {
    await api.markRead([id], isRead);
    toast.success(`Email marked as ${isRead ? 'read' : 'unread'}`);
    loadEmails();
  };

  const handleSingleMarkCompleted = async (id: string) => {
    await api.markCompleted([id]);
    toast.success('Email resolved');
    loadEmails();
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* COLUMN 1: Left Filter Sidebar */}
      <div className="hidden xl:flex flex-col w-56 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0B0F19]/90 p-3.5 shrink-0 overflow-y-auto backdrop-blur-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-150 dark:border-slate-800/80 mb-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Inbox Views
          </span>
          {(selectedCategory !== 'all' || selectedPriority !== 'all' || actionOnly || readFilter !== 'all' || search) && (
            <button
              onClick={handleReset}
              className="text-[10px] font-mono text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick Views */}
        <div className="space-y-1 mb-5">
          <button
            onClick={handleSelectAllMail}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer',
              selectedCategory === 'all' && selectedPriority === 'all' && !actionOnly && readFilter === 'all'
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            )}
          >
            <span className="flex items-center gap-2">
              <InboxIcon className="w-3.5 h-3.5 text-indigo-500" /> All Mail
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">{counts.total}</span>
          </button>

          <button
            onClick={() => handleTogglePriority('Critical')}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer',
              selectedPriority === 'Critical'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            )}
          >
            <span className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-rose-500" /> Critical / P1
            </span>
            {counts.critical > 0 && (
              <span className="text-[10px] font-mono text-white bg-rose-500 px-1.5 py-0.2 rounded-full font-bold">{counts.critical}</span>
            )}
          </button>

          <button
            onClick={handleToggleActionOnly}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer',
              actionOnly
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            )}
          >
            <span className="flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> Action Required
            </span>
            {counts.action > 0 && (
              <span className="text-[10px] font-mono text-white bg-amber-500 px-1.5 py-0.2 rounded-full font-bold">{counts.action}</span>
            )}
          </button>
        </div>

        {/* Read / Unread Status Controller */}
        <div className="mb-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5 px-1">
            Read State
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleReadFilterChange('all')}
              className={cn(
                'flex-1 py-1 rounded-lg text-center text-[11px] font-semibold transition cursor-pointer',
                readFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              All
            </button>
            <button
              onClick={() => handleReadFilterChange('unread')}
              className={cn(
                'flex-1 py-1 rounded-lg text-center text-[11px] font-semibold transition cursor-pointer',
                readFilter === 'unread'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              Unread
            </button>
            <button
              onClick={() => handleReadFilterChange('read')}
              className={cn(
                'flex-1 py-1 rounded-lg text-center text-[11px] font-semibold transition cursor-pointer',
                readFilter === 'read'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              Read
            </button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5 px-1">
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
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition flex items-center justify-between cursor-pointer',
                    selectedCategory === cat
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  )}
                >
                  <span className="truncate">{cat}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold ml-1.5">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Center Email List */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#0B0F19]/60 backdrop-blur-sm',
          selectedEmail && 'hidden md:flex md:w-96 md:max-w-md lg:w-[410px] lg:max-w-[410px] shrink-0'
        )}
      >
        {/* Inbox Search & Controls Header */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2.5 bg-white/80 dark:bg-[#0E1524]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inbox</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-full">
                {emails.length}
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2 py-1 rounded-lg">
              <ArrowUpDown className="w-3 h-3 text-indigo-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold outline-none cursor-pointer text-slate-700 dark:text-slate-300 text-xs"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Search box inside inbox */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list..."
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-100/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bulk Bar (Modern gradient banner) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs shadow-md">
              <div className="flex items-center gap-2">
                <button onClick={handleSelectAll} className="hover:opacity-80 cursor-pointer">
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-[11px]">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleBulkMarkRead(true)}
                  className="p-1 hover:bg-white/20 rounded-md transition cursor-pointer"
                  title="Mark Read"
                >
                  <MailCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleBulkMarkCompleted}
                  className="p-1 hover:bg-white/20 rounded-md transition cursor-pointer"
                  title="Mark Resolved"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Bulk Categorize Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkCategoryMenu(!showBulkCategoryMenu)}
                    className="p-1 hover:bg-white/20 rounded-md transition cursor-pointer"
                    title="Change Category"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>

                  {showBulkCategoryMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1 z-50 space-y-0.5">
                      <span className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                        Set Category
                      </span>
                      {INBOX_CATEGORIES.map((c: EmailCategory) => (
                        <button
                          key={c}
                          onClick={() => handleBulkCategorize(c)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg truncate font-medium cursor-pointer"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Item Rows List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-150 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={InboxIcon}
                title="No matching emails"
                description="Try clearing your search query or reset the category filters."
                actionText="Reset Filters"
                onAction={() => {
                  setSelectedCategory('all');
                  setSelectedPriority('all');
                  setReadFilter('all');
                  setActionOnly(false);
                  setSearch('');
                }}
              />
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = selectedEmailId === email.internal_id;
              const isChecked = selectedIds.includes(email.internal_id);

              return (
                <div
                  key={email.internal_id}
                  onClick={() => setSelectedEmailId(email.internal_id)}
                  className={cn(
                    'group relative p-3.5 cursor-pointer transition-all flex items-start gap-3 border-l-3',
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/35 border-l-indigo-600 dark:border-l-indigo-500 shadow-2xs'
                      : 'border-l-transparent hover:bg-white dark:hover:bg-slate-800/40',
                    !email.is_read && 'bg-white dark:bg-[#0E1524]/60'
                  )}
                >
                  {/* Select Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelect(email.internal_id, e)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>

                  {/* Email Snippet Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {!email.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                        )}
                        <span
                          className={cn(
                            'text-xs truncate',
                            !email.is_read
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-400 font-medium'
                          )}
                        >
                          {email.sender_name}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0 font-medium">
                        {formatRelativeTime(email.received_at)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        'text-xs truncate mb-1',
                        !email.is_read
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {email.subject}
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 font-normal leading-relaxed">
                      {email.triage.summary}
                    </p>

                    {/* Badges Bar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={email.triage.priority} size="sm" />
                      <CategoryBadge category={email.triage.category} size="sm" />

                      {email.has_attachments && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"
                          title="Has Attachments"
                        >
                          <Paperclip className="w-2.5 h-2.5 text-indigo-500" />
                          {email.attachments.length}
                        </span>
                      )}

                      {email.triage.due_date && (
                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold px-1.5 py-0.5 bg-rose-500/10 rounded-md">
                          Due: {email.triage.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: Right Preview / Email Detail */}
      <div className="flex-1 min-w-0 bg-white dark:bg-[#0E1524] h-full overflow-hidden transition-colors">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onClose={() => setSelectedEmailId(null)}
            onToggleRead={handleToggleSingleRead}
            onMarkCompleted={handleSingleMarkCompleted}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={Mail}
              title="Select an email to view details"
              description="Click any conversation from the list to inspect full content, extracted entities, and recommended actions."
            />
          </div>
        )}
      </div>
    </div>
  );
};
