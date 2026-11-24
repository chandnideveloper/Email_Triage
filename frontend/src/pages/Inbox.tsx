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

const ALL_CATEGORIES: EmailCategory[] = [
  'Action Required',
  'Urgent',
  'Client Communication',
  'Meeting / Scheduling',
  'Invoice / Finance',
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
      const res = await api.getEmails({
        search,
        category: selectedCategory,
        priority: selectedPriority,
        readFilter,
        actionRequired: actionOnly ? true : null,
        sortBy,
      });
      setEmails(res.items);

      if (!selectedEmailId && res.items.length > 0) {
        const idFromUrl = searchParams.get('id');
        const match = res.items.find((e) => e.internal_id === idFromUrl);
        setSelectedEmailId(match ? match.internal_id : res.items[0].internal_id);
      }
    } catch {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [search, selectedCategory, selectedPriority, readFilter, actionOnly, sortBy]);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== selectedCategory) setSelectedCategory(cat);
    const prio = searchParams.get('priority');
    if (prio && prio !== selectedPriority) setSelectedPriority(prio);
    const act = searchParams.get('action');
    if (act === 'true') setActionOnly(true);
    const q = searchParams.get('search');
    if (q) setSearch(q);
    const id = searchParams.get('id');
    if (id) setSelectedEmailId(id);
  }, [searchParams]);

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
      <div className="hidden xl:flex flex-col w-56 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d0e] p-3.5 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-150 dark:border-zinc-850 mb-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Inbox Views
          </span>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedPriority('all');
              setReadFilter('all');
              setActionOnly(false);
              setSearch('');
            }}
            className="text-[10px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Reset
          </button>
        </div>

        {/* Quick Views */}
        <div className="space-y-0.5 mb-5">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedPriority('all');
              setActionOnly(false);
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition',
              selectedCategory === 'all' && selectedPriority === 'all' && !actionOnly
                ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
            )}
          >
            <span className="flex items-center gap-2">
              <InboxIcon className="w-3.5 h-3.5 text-zinc-400" /> All Mail
            </span>
            <span className="text-[10px] font-mono text-zinc-400">{emails.length}</span>
          </button>

          <button
            onClick={() => {
              setSelectedPriority('Critical');
              setSelectedCategory('all');
              setActionOnly(false);
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition',
              selectedPriority === 'Critical'
                ? 'bg-red-500/10 text-red-700 dark:text-red-400 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
            )}
          >
            <span className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-red-500" /> Critical / P1
            </span>
          </button>

          <button
            onClick={() => {
              setActionOnly(true);
              setSelectedCategory('all');
              setSelectedPriority('all');
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition',
              actionOnly
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
            )}
          >
            <span className="flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> Action Required
            </span>
          </button>
        </div>

        {/* Read / Unread Status Controller */}
        <div className="mb-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 px-1">
            Read State
          </span>
          <div className="flex bg-zinc-100 dark:bg-zinc-850 p-0.5 rounded text-xs font-mono">
            <button
              onClick={() => setReadFilter('all')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition',
                readFilter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              All
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition',
                readFilter === 'unread'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              Unread
            </button>
            <button
              onClick={() => setReadFilter('read')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition',
                readFilter === 'read'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              Read
            </button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 px-1">
            Categories
          </span>
          <div className="space-y-0.5">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                className={cn(
                  'w-full text-left px-2 py-1 rounded text-xs truncate transition flex items-center justify-between',
                  selectedCategory === cat
                    ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                )}
              >
                <span className="truncate">{cat}</span>
                {selectedCategory === cat && <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Center Email List */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d0e]',
          selectedEmail && 'hidden md:flex md:w-96 md:max-w-md lg:w-[400px] lg:max-w-[400px] shrink-0'
        )}
      >
        {/* Inbox Search & Controls Header */}
        <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 bg-white dark:bg-[#0c0d0e] sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Inbox</h2>
              <span className="text-[11px] font-mono px-1.5 py-0.2 font-medium bg-zinc-100 dark:bg-zinc-850 text-zinc-500 rounded">
                {emails.length}
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <ArrowUpDown className="w-3 h-3" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium outline-none cursor-pointer text-zinc-700 dark:text-zinc-300 text-xs"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Search box inside inbox */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list..."
              className="w-full pl-7 pr-4 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bulk Bar (Linear-style minimal banner) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs">
              <div className="flex items-center gap-2">
                <button onClick={handleSelectAll} className="hover:opacity-80">
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-medium text-[11px]">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBulkMarkRead(true)}
                  className="p-1 hover:opacity-80 rounded transition"
                  title="Mark Read"
                >
                  <MailCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleBulkMarkCompleted}
                  className="p-1 hover:opacity-80 rounded transition"
                  title="Mark Resolved"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Bulk Categorize Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkCategoryMenu(!showBulkCategoryMenu)}
                    className="p-1 hover:opacity-80 rounded transition"
                    title="Change Category"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>

                  {showBulkCategoryMenu && (
                    <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl p-1 z-50 space-y-0.5">
                      <span className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Set Category
                      </span>
                      {ALL_CATEGORIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleBulkCategorize(c)}
                          className="w-full text-left px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded truncate"
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
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-850">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-850 rounded animate-pulse" />
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
                    'group relative p-3 cursor-pointer transition-colors flex items-start gap-2.5',
                    isSelected
                      ? 'bg-zinc-100/90 dark:bg-zinc-850/80'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40',
                    !email.is_read && 'bg-white dark:bg-[#0c0d0e]'
                  )}
                >
                  {/* Select Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelect(email.internal_id, e)}
                    className="mt-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Email Snippet Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {!email.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-xs truncate',
                            !email.is_read
                              ? 'font-bold text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-600 dark:text-zinc-400 font-normal'
                          )}
                        >
                          {email.sender_name}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {formatRelativeTime(email.received_at)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        'text-xs truncate mb-1',
                        !email.is_read
                          ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {email.subject}
                    </p>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1.5 font-normal">
                      {email.triage.summary}
                    </p>

                    {/* Badges Bar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={email.triage.priority} size="sm" />
                      <CategoryBadge category={email.triage.category} size="sm" />

                      {email.has_attachments && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-400 px-1 py-0.2 bg-zinc-100 dark:bg-zinc-850 rounded"
                          title="Has Attachments"
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          {email.attachments.length}
                        </span>
                      )}

                      {email.triage.due_date && (
                        <span className="text-[10px] font-mono text-red-600 dark:text-red-400 font-medium px-1 py-0.2 bg-red-500/10 rounded">
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
      <div className="flex-1 min-w-0 bg-white dark:bg-[#0c0d0e] h-full overflow-hidden">
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
