import {
  AttachmentMetadata,
  DashboardMetrics,
  EmailCategory,
  EmailFilterState,
  EmailListResponse,
  EmailRecord,
  Priority,
  SyncStatus,
} from '@/types';
import { INITIAL_MOCK_EMAILS } from './mockData';

const API_BASE = '/api/triage';

// Local storage key for persistent client updates
const STORAGE_KEY = 'triageai_emails_v1';

function getStoredEmails(): EmailRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading from localStorage:', err);
  }
  // Default to initial mock emails
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EMAILS));
  return INITIAL_MOCK_EMAILS;
}

function saveStoredEmails(emails: EmailRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  } catch (err) {
    console.warn('Error saving to localStorage:', err);
  }
}

export const api = {
  // Check backend health & connectivity
  async checkBackend(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/sync/status`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Fetch emails with client and backend support
  async getEmails(filters?: Partial<EmailFilterState>): Promise<EmailListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);

      const res = await fetch(`${API_BASE}/emails?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback to local store
    }

    // Client-side filtering on stored emails
    let emails = getStoredEmails();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      emails = emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.sender_name.toLowerCase().includes(q) ||
          e.sender_email.toLowerCase().includes(q) ||
          e.triage.summary.toLowerCase().includes(q) ||
          (e.triage.entities.companies || []).some((c: string) => c.toLowerCase().includes(q))
      );
    }

    if (filters?.category && filters.category !== 'all') {
      emails = emails.filter((e) => e.triage.category === filters.category);
    }

    if (filters?.priority && filters.priority !== 'all') {
      emails = emails.filter((e) => e.triage.priority === filters.priority);
    }

    if (filters?.readFilter === 'unread') {
      emails = emails.filter((e) => !e.is_read);
    } else if (filters?.readFilter === 'read') {
      emails = emails.filter((e) => e.is_read);
    }

    if (filters?.actionRequired !== null && filters?.actionRequired !== undefined) {
      emails = emails.filter((e) => e.triage.action_required === filters.actionRequired);
    }

    if (filters?.hasAttachments !== null && filters?.hasAttachments !== undefined) {
      emails = emails.filter((e) => e.has_attachments === filters.hasAttachments);
    }

    // Sorting
    if (filters?.sortBy === 'oldest') {
      emails.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    } else if (filters?.sortBy === 'priority') {
      const pMap: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      emails.sort((a, b) => (pMap[b.triage.priority] || 0) - (pMap[a.triage.priority] || 0));
    } else {
      // newest default
      emails.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    }

    return {
      count: emails.length,
      total: getStoredEmails().length,
      limit: 50,
      offset: 0,
      items: emails,
    };
  },

  // Get single email detail
  async getEmailById(emailId: string): Promise<EmailRecord> {
    try {
      const res = await fetch(`${API_BASE}/emails/${emailId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const emails = getStoredEmails();
    const found = emails.find((e) => e.internal_id === emailId || e.graph_message_id === emailId);
    if (!found) {
      throw new Error(`Email ${emailId} not found`);
    }
    return found;
  },

  // Toggle read status
  async markRead(emailIds: string[], isRead: boolean): Promise<void> {
    const emails = getStoredEmails();
    const idSet = new Set(emailIds);
    const updated = emails.map((e) => {
      if (idSet.has(e.internal_id)) {
        return { ...e, is_read: isRead, updated_at: new Date().toISOString() };
      }
      return e;
    });
    saveStoredEmails(updated);
  },

  // Mark completed / triaged
  async markCompleted(emailIds: string[]): Promise<void> {
    const emails = getStoredEmails();
    const idSet = new Set(emailIds);
    const updated = emails.map((e) => {
      if (idSet.has(e.internal_id)) {
        return {
          ...e,
          is_read: true,
          triage: {
            ...e.triage,
            action_required: false,
            response_required: false,
            follow_up_required: false,
          },
          updated_at: new Date().toISOString(),
        };
      }
      return e;
    });
    saveStoredEmails(updated);
  },

  // Update Category
  async updateCategory(emailIds: string[], newCategory: EmailCategory): Promise<void> {
    const emails = getStoredEmails();
    const idSet = new Set(emailIds);
    const updated = emails.map((e) => {
      if (idSet.has(e.internal_id)) {
        return {
          ...e,
          triage: { ...e.triage, category: newCategory },
          updated_at: new Date().toISOString(),
        };
      }
      return e;
    });
    saveStoredEmails(updated);
  },

  // Trigger sync
  async triggerSync(mailbox?: string): Promise<{ status: string; result?: any }> {
    try {
      const res = await fetch(`${API_BASE}/sync?mailbox=${encodeURIComponent(mailbox || '')}`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    // Simulate sync
    await new Promise((r) => setTimeout(r, 1200));
    return {
      status: 'COMPLETED',
      result: {
        synced_at: new Date().toISOString(),
        new_messages: 2,
        processed: 2,
      },
    };
  },

  // Get Sync status
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const res = await fetch(`${API_BASE}/sync/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    return {
      mailbox: 'triage@yourpractice.com.au',
      last_status: 'HEALTHY_SYNCED',
      last_sync_time: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      emails_synced_total: 1420,
      has_delta_link: true,
      error_code: '',
    };
  },

  // Retry failed email
  async retryEmail(emailId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/emails/${emailId}/retry`, { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { status: 'RETRIED', emailId };
  },

  // Dashboard Aggregations
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const emails = getStoredEmails();

    const totalProcessed = emails.length;
    const unreadCount = emails.filter((e) => !e.is_read).length;
    const actionRequiredCount = emails.filter((e) => e.triage.action_required).length;
    const urgentCount = emails.filter((e) => e.triage.priority === 'Critical' || e.triage.category === 'Urgent').length;
    const responseRequiredCount = emails.filter((e) => e.triage.response_required).length;

    // Upcoming deadlines from triage
    const upcomingDeadlines: DashboardMetrics['dailyBrief']['upcomingDeadlines'] = [];
    const overdueFollowUps: DashboardMetrics['dailyBrief']['overdueFollowUps'] = [];
    const suggestedActions: DashboardMetrics['dailyBrief']['suggestedActions'] = [];

    emails.forEach((e) => {
      if (e.triage.due_date && e.triage.action_required) {
        upcomingDeadlines.push({
          emailId: e.internal_id,
          subject: e.subject,
          company: e.triage.entities.companies?.[0],
          dueDate: e.triage.due_date,
          priority: e.triage.priority,
        });
      }

      if (e.triage.follow_up_required && !e.is_read) {
        overdueFollowUps.push({
          emailId: e.internal_id,
          subject: e.subject,
          sender: e.sender_name,
          daysOverdue: 2,
        });
      }

      if (e.triage.suggested_action && e.triage.action_required) {
        suggestedActions.push({
          id: `act-${e.internal_id}`,
          emailId: e.internal_id,
          title: e.subject,
          actionText: e.triage.suggested_action,
          priority: e.triage.priority,
          category: e.triage.category,
        });
      }
    });

    // Category distribution
    const catCounts: Record<string, number> = {};
    emails.forEach((e) => {
      const cat = e.triage.category;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categoryColors: Record<string, string> = {
      'Urgent': '#EF4444',
      'Action Required': '#F97316',
      'Invoice / Finance': '#10B981',
      'Client Communication': '#6366F1',
      'Meeting / Scheduling': '#8B5CF6',
      'Technical Issue': '#EC4899',
      'Follow-up Required': '#F59E0B',
      'Information / FYI': '#3B82F6',
      'Spam / Unwanted': '#6B7280',
      'Other': '#94A3B8',
    };

    const categoryBreakdown = Object.entries(catCounts).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#6366F1',
    }));

    // Priority distribution
    const prioCounts: Record<Priority, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    emails.forEach((e) => {
      prioCounts[e.triage.priority] = (prioCounts[e.triage.priority] || 0) + 1;
    });

    const priorityDistribution = [
      { priority: 'Critical', count: prioCounts.Critical, color: '#E11D48' },
      { priority: 'High', count: prioCounts.High, color: '#F59E0B' },
      { priority: 'Medium', count: prioCounts.Medium, color: '#38BDF8' },
      { priority: 'Low', count: prioCounts.Low, color: '#94A3B8' },
    ];

    // Volume chart mockup (past 7 days)
    const volumeOverTime = [
      { date: 'Nov 17', count: 42, actionRequired: 14 },
      { date: 'Nov 18', count: 58, actionRequired: 22 },
      { date: 'Nov 19', count: 65, actionRequired: 19 },
      { date: 'Nov 20', count: 71, actionRequired: 29 },
      { date: 'Nov 21', count: 83, actionRequired: 34 },
      { date: 'Nov 22', count: 48, actionRequired: 15 },
      { date: 'Nov 23', count: totalProcessed + 52, actionRequired: actionRequiredCount + 18 },
    ];

    return {
      totalProcessed: totalProcessed + 1420,
      unreadCount,
      actionRequiredCount,
      urgentCount,
      responseRequiredCount,
      successRate: 99.8,
      avgConfidence: 0.94,
      recentEmails: emails.slice(0, 5),
      dailyBrief: {
        importantCount: urgentCount + actionRequiredCount,
        upcomingDeadlines,
        overdueFollowUps,
        suggestedActions: suggestedActions.slice(0, 4),
      },
      charts: {
        volumeOverTime,
        categoryBreakdown,
        priorityDistribution,
      },
    };
  },

  // Get aggregated attachments list
  async getAttachments(): Promise<
    Array<
      AttachmentMetadata & {
        parentSubject: string;
        parentSender: string;
        receivedAt: string;
      }
    >
  > {
    const emails = getStoredEmails();
    const result: Array<
      AttachmentMetadata & {
        parentSubject: string;
        parentSender: string;
        receivedAt: string;
      }
    > = [];

    emails.forEach((email) => {
      if (email.attachments && email.attachments.length > 0) {
        email.attachments.forEach((att) => {
          result.push({
            ...att,
            parentSubject: email.subject,
            parentSender: email.sender_name,
            receivedAt: email.received_at,
          });
        });
      }
    });

    return result;
  },

  // Reset to initial mock data (for testing & resetting demo state)
  resetDemoData(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EMAILS));
  },
};
