import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle,
  Inbox as InboxIcon,
  Flame,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowDownCircle,
  ArrowUpDown,
  Mail,
  MailCheck,
  Tag,
  Paperclip,
  CheckSquare,
  CheckCircle2,
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

  const [allEmails, setAllEmails] = useState<EmailRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    searchParams.get('id') || null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkCategoryMenu, setShowBulkCategoryMenu] = useState(false);

  // Filters from URL
  const search = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || 'all';
  const selectedPriority = searchParams.get('priority') || 'all';
  const readFilter = (searchParams.get('read') as 'all' | 'unread' | 'read') || 'all';
  const actionOnly = searchParams.get('action') === 'true';
  const attachmentsOnly = searchParams.get('attachments') === 'true';
  const resolvedOnly = searchParams.get('resolved') === 'true';
  const sortBy = (searchParams.get('sort') as 'newest' | 'oldest' | 'priority') || 'newest';

  const setSearch = (val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('search', val);
    else next.delete('search');
    setSearchParams(next);
  };

  const setSortBy = (val: 'newest' | 'oldest' | 'priority') => {
    const next = new URLSearchParams(searchParams);
    if (val === 'newest') next.delete('sort');
    else next.set('sort', val);
    setSearchParams(next);
  };

  // Synchronize selectedEmailId with URL param if present
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && id !== selectedEmailId) {
      setSelectedEmailId(id);
    }
  }, [searchParams]);

  // Load all emails from API / localStorage
  const loadEmails = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const res = await api.getEmails({});
      setAllEmails(res.items);
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

  // Initial load & periodic background sync (every 10s)
  useEffect(() => {
    loadEmails(false);
    const interval = setInterval(() => loadEmails(true), 10000);
    const handleUpdate = () => loadEmails(true);
    window.addEventListener('triage_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('triage_updated', handleUpdate);
    };
  }, []);

  // Compute live counts synchronously in memory
  const counts = useMemo(() => {
    const raw = allEmails;
    const cats: Record<string, number> = {};
    raw.forEach((e) => {
      const c = e.triage?.category || 'Other';
      cats[c] = (cats[c] || 0) + 1;
    });
    return {
      total: raw.length,
      critical: raw.filter((e) => e.triage?.priority === 'Critical').length,
      high: raw.filter((e) => e.triage?.priority === 'High').length,
      medium: raw.filter((e) => e.triage?.priority === 'Medium').length,
      low: raw.filter((e) => e.triage?.priority === 'Low').length,
      action: raw.filter((e) => e.triage?.action_required).length,
      hasAttachments: raw.filter((e) => e.has_attachments).length,
      resolved: raw.filter((e) => e.processing_status === 'COMPLETED').length,
      unread: raw.filter((e) => !e.is_read).length,
      read: raw.filter((e) => e.is_read).length,
      categories: cats,
    };
  }, [allEmails]);

  // Compute filtered emails synchronously in memory (instant 0ms response)
  const filteredEmails = useMemo(() => {
    let list = [...allEmails];

    // Search query filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.subject?.toLowerCase().includes(q) ||
          e.sender_name?.toLowerCase().includes(q) ||
          e.sender_email?.toLowerCase().includes(q) ||
          e.body_plain?.toLowerCase().includes(q) ||
          e.triage?.summary?.toLowerCase().includes(q) ||
          (e.triage?.entities?.companies || []).some((c: string) => c.toLowerCase().includes(q)) ||
          (e.triage?.entities?.amounts || []).some((a: string) => a.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.triage?.category === selectedCategory);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      list = list.filter((e) => e.triage?.priority === selectedPriority);
    }

    // Read State filter
    if (readFilter === 'unread') {
      list = list.filter((e) => !e.is_read);
    } else if (readFilter === 'read') {
      list = list.filter((e) => e.is_read);
    }

    // Action Required filter
    if (actionOnly) {
      list = list.filter((e) => e.triage?.action_required);
    }

    // Attachments filter
    if (attachmentsOnly) {
      list = list.filter((e) => e.has_attachments);
    }

    // Resolved filter
    if (resolvedOnly) {
      list = list.filter((e) => e.processing_status === 'COMPLETED');
    }

    // Sort order
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    } else if (sortBy === 'priority') {
      const prioWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      list.sort(
        (a, b) =>
          (prioWeight[b.triage?.priority || 'Low'] || 0) -
          (prioWeight[a.triage?.priority || 'Low'] || 0)
      );
    }

    return list;
  }, [
    allEmails,
    search,
    selectedCategory,
    selectedPriority,
    readFilter,
    actionOnly,
    attachmentsOnly,
    resolvedOnly,
    sortBy,
  ]);

  // Automatically maintain selected email if available
  useEffect(() => {
    if (filteredEmails.length > 0) {
      if (!selectedEmailId || !filteredEmails.some((e) => e.internal_id === selectedEmailId)) {
        const idFromUrl = searchParams.get('id');
        const match = idFromUrl ? filteredEmails.find((e) => e.internal_id === idFromUrl) : null;
        if (match) {
          setSelectedEmailId(match.internal_id);
        } else {
          setSelectedEmailId(filteredEmails[0].internal_id);
        }
      }
    }
  }, [filteredEmails, selectedEmailId, searchParams]);

  const selectedEmail = useMemo(() => {
    return allEmails.find((e) => e.internal_id === selectedEmailId) || null;
  }, [allEmails, selectedEmailId]);

  // Click email to open & automatically mark as read
  const handleOpenEmail = (email: EmailRecord) => {
    setSelectedEmailId(email.internal_id);
    const next = new URLSearchParams(searchParams);
    next.set('id', email.internal_id);
    setSearchParams(next);

    if (!email.is_read) {
      setAllEmails((prev) =>
        prev.map((e) => (e.internal_id === email.internal_id ? { ...e, is_read: true } : e))
      );
      api.markRead([email.internal_id], true, true);
    }
  };

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

  const handleToggleAttachmentsOnly = () => {
    const next = new URLSearchParams(searchParams);
    if (attachmentsOnly) {
      next.delete('attachments');
    } else {
      next.set('attachments', 'true');
    }
    setSearchParams(next);
  };

  const handleToggleResolvedOnly = () => {
    const next = new URLSearchParams(searchParams);
    if (resolvedOnly) {
      next.delete('resolved');
    } else {
      next.set('resolved', 'true');
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
    // Remove specific email id from URL when switching read state so read emails don't leak into unread
    next.delete('id');
    setSelectedEmailId(null);
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map((e) => e.internal_id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkMarkCompleted = async () => {
    if (selectedIds.length === 0) return;
    const targetIds = [...selectedIds];
    setAllEmails((prev) =>
      prev.map((e) =>
        targetIds.includes(e.internal_id)
          ? {
              ...e,
              is_read: true,
              processing_status: 'COMPLETED' as any,
              triage: {
                ...e.triage,
                action_required: false,
                response_required: false,
                follow_up_required: false,
              },
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
    setAllEmails((prev) =>
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
              selectedCategory === 'all' && selectedPriority === 'all' && !actionOnly && !attachmentsOnly && !resolvedOnly && readFilter === 'all'
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
        </div>

        {/* Priority Filter */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1.5 px-1">
            Priority
          </span>
          <div className="space-y-0.5">
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
              onClick={() => handleTogglePriority('High')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
                selectedPriority === 'High'
                  ? 'bg-[#FBF3E6] text-[#D99A38] font-semibold border border-[#F5E0C2]'
                  : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
              )}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D99A38]" /> High
              </span>
              {counts.high > 0 && (
                <span className="text-[10px] font-mono text-[#D99A38] bg-[#FFFFFF] border border-[#F5E0C2] px-1.5 py-0.2 rounded font-semibold">
                  {counts.high}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTogglePriority('Medium')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
                selectedPriority === 'Medium'
                  ? 'bg-[#EDF3F8] text-[#2F658A] font-semibold border border-[#D0E2EE]'
                  : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
              )}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#2F658A]" /> Medium
              </span>
              {counts.medium > 0 && (
                <span className="text-[10px] font-mono text-[#2F658A] bg-[#FFFFFF] border border-[#D0E2EE] px-1.5 py-0.2 rounded font-semibold">
                  {counts.medium}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTogglePriority('Low')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
                selectedPriority === 'Low'
                  ? 'bg-[#F0F4F7] text-[#556977] font-semibold border border-[#D9E2E8]'
                  : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
              )}
            >
              <span className="flex items-center gap-2">
                <ArrowDownCircle className="w-3.5 h-3.5 text-[#556977]" /> Low
              </span>
              {counts.low > 0 && (
                <span className="text-[10px] font-mono text-[#556977] bg-[#FFFFFF] border border-[#D9E2E8] px-1.5 py-0.2 rounded font-semibold">
                  {counts.low}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1.5 px-1">
            Quick Filters
          </span>
          <div className="space-y-0.5">
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

            <button
              onClick={handleToggleAttachmentsOnly}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
                attachmentsOnly
                  ? 'bg-[#E8F4F1] text-[#16877A] font-semibold border border-[#C6E6DF]'
                  : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
              )}
            >
              <span className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-[#16877A]" /> With Attachments
              </span>
              {counts.hasAttachments > 0 && (
                <span className="text-[10px] font-mono text-[#16877A] bg-[#FFFFFF] border border-[#C6E6DF] px-1.5 py-0.2 rounded font-semibold">
                  {counts.hasAttachments}
                </span>
              )}
            </button>

            <button
              onClick={handleToggleResolvedOnly}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition cursor-pointer',
                resolvedOnly
                  ? 'bg-[#E8F4F1] text-[#16877A] font-semibold border border-[#C6E6DF]'
                  : 'text-[#687786] hover:bg-[#E3E9ED]/60 hover:text-[#202B35]'
              )}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16877A]" /> Resolved
              </span>
              {counts.resolved > 0 && (
                <span className="text-[10px] font-mono text-[#16877A] bg-[#FFFFFF] border border-[#C6E6DF] px-1.5 py-0.2 rounded font-semibold">
                  {counts.resolved}
                </span>
              )}
            </button>
          </div>
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
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1',
                readFilter === 'all'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              All
              <span className="text-[10px] opacity-75 font-mono">({counts.total})</span>
            </button>
            <button
              onClick={() => handleReadFilterChange('unread')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1',
                readFilter === 'unread'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              Unread
              {counts.unread > 0 && (
                <span className="text-[10px] font-semibold text-[#16877A] font-mono">({counts.unread})</span>
              )}
            </button>
            <button
              onClick={() => handleReadFilterChange('read')}
              className={cn(
                'flex-1 py-1 rounded text-center text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1',
                readFilter === 'read'
                  ? 'bg-[#FFFFFF] text-[#172B3A] shadow-2xs font-semibold'
                  : 'text-[#687786] hover:text-[#202B35]'
              )}
            >
              Read
              <span className="text-[10px] opacity-75 font-mono">({counts.read})</span>
            </button>
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
                {filteredEmails.length}
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
        {filteredEmails.length > 0 && (
          <div className="px-3 py-1.5 border-b border-[#E3E9ED] bg-[#F5F7F8] flex items-center justify-between text-xs text-[#687786]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-[#687786] hover:text-[#202B35] flex items-center gap-1.5 cursor-pointer"
              >
                {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
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
          {loading && allEmails.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-18 bg-[#F5F7F8] rounded animate-pulse" />
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                icon={InboxIcon}
                title={
                  readFilter === 'unread'
                    ? 'All caught up!'
                    : readFilter === 'read'
                    ? 'No read emails'
                    : 'No emails match your filter'
                }
                description={
                  readFilter === 'unread'
                    ? 'No unread emails in your inbox.'
                    : readFilter === 'read'
                    ? 'Open any email to mark it as read.'
                    : 'Try clearing search or filters to see all messages.'
                }
                action={
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium text-[#16877A] border border-[#16877A]/40 rounded hover:bg-[#E8F4F1] transition"
                  >
                    {readFilter !== 'all' ? 'View All Mail' : 'Clear Filters'}
                  </button>
                }
              />
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isSelected = selectedEmailId === email.internal_id;
              const isChecked = selectedIds.includes(email.internal_id);

              return (
                <div
                  key={email.internal_id}
                  onClick={() => handleOpenEmail(email)}
                  className={cn(
                    'px-3 py-2.5 cursor-pointer transition select-none relative group',
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      {email.has_attachments && (
                        <span
                          className="text-[10px] text-[#687786] flex items-center gap-0.5 font-mono"
                          title={`${email.attachments.length} attachment(s)`}
                        >
                          <Paperclip className="w-3 h-3 text-[#687786]" />
                          {email.attachments.length > 1 && email.attachments.length}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#687786]">
                        {formatRelativeTime(email.received_at)}
                      </span>
                    </div>
                  </div>

                  <p
                    className={cn(
                      'text-xs truncate mb-0.5 pl-5',
                      !email.is_read ? 'font-semibold text-[#172B3A]' : 'text-[#202B35]'
                    )}
                  >
                    {email.subject}
                  </p>

                  <p className="text-[11px] text-[#687786] line-clamp-1 pl-5">
                    {email.triage?.summary || email.body_plain}
                  </p>
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
            onMarkCompleted={async (id) => {
              setAllEmails((prev) =>
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
