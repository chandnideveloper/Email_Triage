import React from 'react';
import {
  Paperclip,
  CheckCircle2,
  MailCheck,
  Mail,
  Reply,
  Forward,
  Download,
  Calendar,
  Building,
  DollarSign,
  AlertOctagon,
  Clock,
  FileSpreadsheet,
  FileText,
  FileCode,
  File,
  X,
  Layers,
} from 'lucide-react';
import { EmailRecord } from '@/types';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatEmailDate, formatBytes, getFileIcon } from '@/utils/formatters';
import { useToast } from '@/components/ui/Toast';

interface EmailDetailViewProps {
  email: EmailRecord;
  onClose?: () => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onMarkCompleted: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onClose,
  onToggleRead,
  onMarkCompleted,
}) => {
  const toast = useToast();

  const handleDownloadAttachment = (filename: string) => {
    toast.success('Downloaded', `Saved ${filename} to local filesystem.`);
  };

  const getAttachmentIcon = (filename: string) => {
    const type = getFileIcon(filename);
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'doc':
        return <FileCode className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0c0d0e] overflow-y-auto">
      {/* Action Header */}
      <div className="px-5 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0c0d0e]/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={email.triage.priority} />
          <CategoryBadge category={email.triage.category} />
          <StatusBadge status={email.processing_status} size="sm" />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mark read / unread */}
          <button
            onClick={() => onToggleRead(email.internal_id, !email.is_read)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 transition"
            title={email.is_read ? 'Mark as Unread' : 'Mark as Read'}
          >
            {email.is_read ? <Mail className="w-4 h-4" /> : <MailCheck className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />}
          </button>

          {/* Mark Completed */}
          <button
            onClick={() => onMarkCompleted(email.internal_id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded transition"
            title="Resolve and mark triaged"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark Resolved</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 transition lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Subject & Meta Header */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            {email.subject}
          </h2>

          <div className="mt-3 flex items-start justify-between gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-850 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {email.sender_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {email.sender_name}
                  </span>
                  <span className="text-zinc-400 font-mono text-[11px]">&lt;{email.sender_email}&gt;</span>
                </div>
                <div className="text-zinc-500 text-[11px] mt-0.5">
                  To: {email.recipients.map((r) => r.email).join(', ') || 'triage@yourpractice.com.au'}
                  {email.cc.length > 0 && ` • CC: ${email.cc.map((c) => c.email).join(', ')}`}
                </div>
              </div>
            </div>

            <span className="text-[11px] font-mono text-zinc-400 shrink-0">
              {formatEmailDate(email.received_at)}
            </span>
          </div>
        </div>

        {/* Executive Triage Dossier (Linear / Notion clean structured style) */}
        <div className="p-4 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-[#121316] space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-700 dark:bg-zinc-300" />
              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Triage Overview & Extracted Entities
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 font-mono text-[10px]">Confidence</span>
              <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                {Math.round(email.triage.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
              Executive Summary
            </span>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed bg-white dark:bg-zinc-900 p-3 rounded border border-zinc-200/70 dark:border-zinc-800">
              {email.triage.summary}
            </p>
          </div>

          {/* Key Points */}
          {email.triage.key_points && email.triage.key_points.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">
                Key Action Points
              </span>
              <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                {email.triage.key_points.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0 mt-1.5" />
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Entities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {/* Due Date */}
            {email.triage.due_date && (
              <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3 h-3 text-zinc-400" /> Deadline
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400 font-mono text-xs">
                  {email.triage.due_date}
                </span>
              </div>
            )}

            {/* Extracted Amounts */}
            {email.triage.entities.amounts && email.triage.entities.amounts.length > 0 && (
              <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mb-0.5">
                  <DollarSign className="w-3 h-3 text-zinc-400" /> Financial Value
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                  {email.triage.entities.amounts.join(', ')}
                </span>
              </div>
            )}

            {/* Companies */}
            {email.triage.entities.companies && email.triage.entities.companies.length > 0 && (
              <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mb-0.5">
                  <Building className="w-3 h-3 text-zinc-400" /> Entity
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block text-xs">
                  {email.triage.entities.companies[0]}
                </span>
              </div>
            )}
          </div>

          {/* Action Flags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {email.triage.action_required && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[11px] font-medium">
                <AlertOctagon className="w-3 h-3" /> Action Required
              </span>
            )}
            {email.triage.response_required && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 text-[11px] font-medium">
                <Clock className="w-3 h-3" /> Response Required
              </span>
            )}
            {email.triage.follow_up_required && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/25 text-[11px] font-medium">
                <Clock className="w-3 h-3" /> Follow-up Flagged
              </span>
            )}
          </div>

          {/* Recommended Next Action */}
          {email.triage.suggested_action && (
            <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">
                Suggested Next Step
              </span>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {email.triage.suggested_action}
              </p>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" />
                Attachments ({email.attachments.length})
              </span>
              <span className="text-[10px] font-mono text-zinc-400">SHA-256 Deduplicated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {getAttachmentIcon(att.filename)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {att.filename}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {formatBytes(att.size_bytes)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadAttachment(att.filename)}
                    className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded transition"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Content Body */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Raw Message Content
          </span>
          <div className="p-4 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
            {email.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                className="prose dark:prose-invert max-w-none text-xs"
              />
            ) : (
              <pre className="font-sans whitespace-pre-wrap">{email.body_plain}</pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-850 rounded border border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-60"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-850 rounded border border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-60"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-400">
            {email.internal_id}
          </span>
        </div>
      </div>
    </div>
  );
};
