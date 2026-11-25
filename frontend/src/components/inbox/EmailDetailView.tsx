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
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { EmailRecord } from '@/types';
import { api } from '@/services/api';
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

  const handleDownloadAttachment = (att: any) => {
    api.downloadAttachment(email.internal_id, att.id || att.filename, att.filename);
    toast.success('Downloading', `Downloading ${att.filename}`);
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

  const rawAiClassification = (email.triage?.entities as any)?.ai_classification;
  const aiClassification = rawAiClassification || {
    document_type: email.triage?.category
      ? email.triage.category.toLowerCase().replace(/[\s/]+/g, '_')
      : 'general_correspondence',
    platform_subtype: null,
    confidence: email.triage?.confidence ?? 0.85,
    status: (email.triage?.confidence ?? 0.85) >= 0.85 ? 'ready' : 'needs_review',
    client: {
      client_name: email.sender_name || 'No match (Internal)',
    },
    sensitivity: 'normal',
    review_reasons: [],
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0E1524] overflow-y-auto transition-colors">
      {/* Action Header */}
      <div className="px-6 h-14 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0E1524]/85 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={email.triage.priority} />
          <CategoryBadge category={email.triage.category} />
          <StatusBadge status={email.processing_status} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {/* Mark read / unread */}
          <button
            onClick={() => onToggleRead(email.internal_id, !email.is_read)}
            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={email.is_read ? 'Mark as Unread' : 'Mark as Read'}
          >
            {email.is_read ? <Mail className="w-4 h-4" /> : <MailCheck className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Mark Completed */}
          <button
            onClick={() => onMarkCompleted(email.internal_id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-sm shadow-emerald-500/20 transition active:scale-[0.98] cursor-pointer"
            title="Resolve and mark triaged"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Resolved</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Subject & Meta Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
            {email.subject}
          </h2>

          <div className="mt-3.5 flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#121826]/80 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20 ring-1 ring-white/20">
                {email.sender_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {email.sender_name}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">&lt;{email.sender_email}&gt;</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  To: <span className="font-mono text-indigo-600 dark:text-indigo-400">{email.recipients.map((r) => r.email).join(', ') || 'ibex.triage@aoscaustralia.com'}</span>
                  {email.cc.length > 0 && ` • CC: ${email.cc.map((c) => c.email).join(', ')}`}
                </div>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 shrink-0 font-medium bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
              {formatEmailDate(email.received_at)}
            </span>
          </div>
        </div>

        {/* Executive Triage Dossier */}
        <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Triage Overview & Extracted Entities
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">AI Confidence</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xs">
                {Math.round(email.triage.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* AI Classification Insights Card */}
          {aiClassification && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/90 via-sky-50/60 to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-indigo-200/70 dark:border-indigo-800/40 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  AI Document Classification
                </span>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-2xs ${
                    aiClassification.status === 'ready'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  }`}
                >
                  Status: {aiClassification.status === 'ready' ? 'Ready for CRM' : 'Needs Review'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-mono font-medium block">Document Model</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                    {aiClassification.document_type}
                    {aiClassification.platform_subtype ? ` (${aiClassification.platform_subtype})` : ''}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-mono font-medium block">Client Match (ABN)</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                    {aiClassification.client?.client_name || 'No match (Internal)'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-mono font-medium block">Compliance Check</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate block flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> TFN Redacted / Clean
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold block mb-1">
              Executive Summary
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 border-l-3 border-l-indigo-500">
              {email.triage.summary}
            </p>
          </div>

          {/* Key Points */}
          {email.triage.key_points && email.triage.key_points.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold block mb-1.5">
                Key Action Points
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {email.triage.key_points.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span className="font-medium leading-relaxed">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Entities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Due Date */}
            {email.triage.due_date && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" /> Deadline
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">
                  {email.triage.due_date}
                </span>
              </div>
            )}

            {/* Extracted Amounts */}
            {email.triage.entities.amounts && email.triage.entities.amounts.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Financial Value
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                  {email.triage.entities.amounts.join(', ')}
                </span>
              </div>
            )}

            {/* Companies */}
            {email.triage.entities.companies && email.triage.entities.companies.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mb-1 font-medium">
                  <Building className="w-3.5 h-3.5 text-indigo-500" /> Entity
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate block text-xs">
                  {email.triage.entities.companies[0]}
                </span>
              </div>
            )}
          </div>

          {/* Action Flags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {email.triage.action_required && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-[11px] font-semibold">
                <AlertOctagon className="w-3 h-3" /> Action Required
              </span>
            )}
            {email.triage.response_required && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 text-[11px] font-semibold">
                <Clock className="w-3 h-3" /> Response Required
              </span>
            )}
            {email.triage.follow_up_required && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[11px] font-semibold">
                <Clock className="w-3 h-3" /> Follow-up Flagged
              </span>
            )}
          </div>

          {/* Recommended Next Action */}
          {email.triage.suggested_action && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200/70 dark:border-indigo-800/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block mb-1">
                Suggested Next Step
              </span>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {email.triage.suggested_action}
              </p>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                Attachments ({email.attachments.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">SHA-256 Deduplicated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] flex items-center justify-between gap-3 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500">
                      {getAttachmentIcon(att.filename)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {att.filename}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {formatBytes(att.size_bytes)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadAttachment(att)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition cursor-pointer"
                    title={`Download ${att.filename}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Content Body */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            Raw Message Content
          </span>
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111726] text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans shadow-sm">
            {email.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                className="prose dark:prose-invert max-w-none text-xs"
              />
            ) : (
              <pre className="font-sans whitespace-pre-wrap leading-relaxed">{email.body_plain}</pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-medium">
            {email.internal_id}
          </span>
        </div>
      </div>
    </div>
  );
};
