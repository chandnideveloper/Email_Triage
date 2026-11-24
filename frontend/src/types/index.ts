export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type EmailCategory =
  | 'Action Required'
  | 'Urgent'
  | 'Client Communication'
  | 'Meeting / Scheduling'
  | 'Invoice / Finance'
  | 'Technical Issue'
  | 'Information / FYI'
  | 'Follow-up Required'
  | 'Spam / Unwanted'
  | 'Other'
  | 'Unknown / Needs Review';

export type ProcessingStatus =
  | 'PENDING'
  | 'INGESTED'
  | 'TRIAGED'
  | 'ATTACHMENTS_PROCESSED'
  | 'FAILED'
  | 'RETRYING';

export interface AttachmentMetadata {
  id: string;
  graph_attachment_id?: string;
  email_internal_id?: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  is_inline: boolean;
  storage_path?: string;
  downloaded_at?: string;
  ibex_compatible_payload?: {
    source?: string;
    original_filename?: string;
    sha256?: string;
    size_bytes?: number;
    storage_path?: string;
    content_type?: string;
    needs_ocr?: boolean;
    is_inline?: boolean;
    display_name?: string;
    [key: string]: any;
  };
}

export interface TriageResult {
  category: EmailCategory;
  priority: Priority;
  confidence: number;
  action_required: boolean;
  response_required: boolean;
  follow_up_required: boolean;
  suggested_action: string;
  due_date: string | null;
  summary: string;
  key_points: string[];
  entities: {
    amounts?: string[];
    companies?: string[];
    due_date?: string;
    sender_name?: string;
    abn?: string[];
    tax_items?: string[];
    [key: string]: any;
  };
  triaged_at?: string;
}

export interface EmailContact {
  name: string;
  email: string;
}

export interface EmailRecord {
  internal_id: string;
  graph_message_id: string;
  internet_message_id?: string;
  conversation_id?: string;
  sender_name: string;
  sender_email: string;
  recipients: EmailContact[];
  cc: EmailContact[];
  bcc?: EmailContact[];
  subject: string;
  body_plain: string;
  body_html: string;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  attachments: AttachmentMetadata[];
  triage: TriageResult;
  processing_status: ProcessingStatus;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailListResponse {
  count: number;
  total: number;
  limit: number;
  offset: number;
  items: EmailRecord[];
}

export interface SyncStatus {
  mailbox: string;
  last_status: string;
  last_sync_time: string;
  emails_synced_total: number;
  has_delta_link: boolean;
  error_code: string;
}

export interface EmailFilterState {
  search: string;
  category: string;
  priority: string;
  status: string;
  readFilter: 'all' | 'unread' | 'read';
  actionRequired: boolean | null;
  hasAttachments: boolean | null;
  dateFilter: 'all' | 'today' | '7d' | '30d';
  sortBy: 'newest' | 'oldest' | 'priority' | 'urgency';
}

export interface DashboardMetrics {
  totalProcessed: number;
  unreadCount: number;
  actionRequiredCount: number;
  urgentCount: number;
  responseRequiredCount: number;
  successRate: number;
  avgConfidence: number;
  recentEmails: EmailRecord[];
  dailyBrief: {
    importantCount: number;
    upcomingDeadlines: Array<{
      emailId: string;
      subject: string;
      company?: string;
      dueDate: string;
      priority: Priority;
    }>;
    overdueFollowUps: Array<{
      emailId: string;
      subject: string;
      sender: string;
      daysOverdue: number;
    }>;
    suggestedActions: Array<{
      id: string;
      emailId: string;
      title: string;
      actionText: string;
      priority: Priority;
      category: EmailCategory;
    }>;
  };
  charts: {
    volumeOverTime: Array<{ date: string; count: number; actionRequired: number }>;
    categoryBreakdown: Array<{ name: string; value: number; color: string }>;
    priorityDistribution: Array<{ priority: string; count: number; color: string }>;
  };
}
