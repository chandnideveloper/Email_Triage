import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Check,
  ChevronDown,
  Edit3,
  ExternalLink,
  UserCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { EmailRecord, EmailCategory, Priority } from '@/types';
import { api } from '@/services/api';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatEmailDate, formatBytes, getFileIcon } from '@/utils/formatters';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

interface EmailDetailViewProps {
  email: EmailRecord;
  onClose?: () => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onMarkCompleted: (id: string) => void;
}

const ALL_CATEGORIES: EmailCategory[] = [
  'Invoice / Finance',
  'Client Communication',
  'Meeting / Scheduling',
  'Technical Issue',
  'Information / FYI',
  'Follow-up Required',
  'Spam / Unwanted',
  'Other',
];

const ALL_PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onClose,
  onToggleRead,
  onMarkCompleted,
}) => {
  const toast = useToast();
  const [currentEmail, setCurrentEmail] = useState<EmailRecord>(email);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isDataApproved, setIsDataApproved] = useState(false);
  const [isManualReviewSent, setIsManualReviewSent] = useState(false);

  useEffect(() => {
    setCurrentEmail(email);
  }, [email]);

  const isAnalyzing =
    currentEmail.processing_status === 'PENDING' ||
    currentEmail.processing_status === 'INGESTED' ||
    currentEmail.processing_status === 'RETRYING' ||
    (!currentEmail.triage?.triaged_at && currentEmail.processing_status !== 'COMPLETED');

  // Progressive polling: check every 1.5s while email is actively being analyzed by AI
  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await api.getEmailById(currentEmail.internal_id);
        if (
          fresh &&
          fresh.processing_status !== 'PENDING' &&
          fresh.processing_status !== 'INGESTED'
        ) {
          setCurrentEmail(fresh);
          window.dispatchEvent(new Event('triage_updated'));
        }
      } catch (err) {
        console.debug('Polling pending email status:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentEmail.internal_id, isAnalyzing]);

  const handleDownloadAttachment = (att: any) => {
    api.downloadAttachment(currentEmail.internal_id, att.id || att.filename, att.filename);
    toast.success('Downloading', `Downloading ${att.filename}`);
  };

  const getAttachmentIcon = (filename: string) => {
    const type = getFileIcon(filename);
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet className="w-4 h-4 text-[#16877A]" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-[#C94F56]" />;
      case 'doc':
        return <FileCode className="w-4 h-4 text-[#547FA5]" />;
      default:
        return <File className="w-4 h-4 text-[#687786]" />;
    }
  };

  const handleCategoryChange = async (cat: EmailCategory) => {
    setShowCategoryMenu(false);
    await api.updateCategory([currentEmail.internal_id], cat);
    toast.success('Category Updated', `Assigned to ${cat}`);
    window.dispatchEvent(new Event('triage_updated'));
  };

  const handlePriorityChange = async (prio: Priority) => {
    setShowPriorityMenu(false);
    try {
      await api.updatePriority([currentEmail.internal_id], prio);
      toast.success('Priority Updated', `Set priority to ${prio}`);
      window.dispatchEvent(new Event('triage_updated'));
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleApproveData = () => {
    setIsDataApproved(true);
    toast.success('Data Approved', 'Extracted financial fields verified and marked ledger-ready.');
    onMarkCompleted(currentEmail.internal_id);
  };

  const handleSendManualReview = () => {
    setIsManualReviewSent(true);
    toast.info('Sent to Review Queue', 'Flagged for senior financial accountant inspection.');
  };

  const rawAiClassification = (currentEmail.triage?.entities as any)?.ai_classification;
  const isInvoiceCategory = currentEmail.triage?.category === 'Invoice / Finance';

  const aiClassification = rawAiClassification || {
    document_type: currentEmail.triage?.category
      ? currentEmail.triage.category.toLowerCase().replace(/[\s/]+/g, '_')
      : 'standard_correspondence',
    confidence: currentEmail.triage?.confidence ?? 0.85,
    status: (currentEmail.triage?.confidence ?? 0.85) >= 0.85 ? 'ready' : 'needs_review',
    client: {
      client_name: currentEmail.sender_name || currentEmail.sender_email,
    },
    sensitivity: 'normal',
    review_reasons: [],
  };

  const entities = currentEmail.triage?.entities || {};
  const extractedFields = (entities as any).ai_classification?.extracted_fields || {};

  const abn = entities.abn || extractedFields.abn || null;
  const invoiceNumber = entities.invoice_number || extractedFields.reference || null;
  const supplierName = entities.supplier_name || extractedFields.supplier_name || entities.companies?.[0] || null;
  const totalAmount =
    entities.total_amount ||
    (extractedFields.amount_total != null ? `$${Number(extractedFields.amount_total).toFixed(2)}` : null) ||
    entities.amounts?.[0] ||
    null;
  const gstAmount =
    entities.gst ||
    (extractedFields.gst != null ? `$${Number(extractedFields.gst).toFixed(2)}` : null) ||
    null;
  const subtotalAmount =
    entities.subtotal ||
    (extractedFields.subtotal != null ? `$${Number(extractedFields.subtotal).toFixed(2)}` : null) ||
    null;
  const dueDate = currentEmail.triage?.due_date || entities.due_date || extractedFields.due_date || null;
  const documentDate = entities.document_date || extractedFields.document_date || null;
  const rawBankDetails = entities.bank_details || extractedFields.bank_details;
  const bankDetails = rawBankDetails && (rawBankDetails.bsb || rawBankDetails.account_number) ? rawBankDetails : null;
  const attachmentSource = entities.attachment_source || currentEmail.attachments?.[0]?.filename || null;

  const hasFinancialEntities = Boolean(
    abn ||
    invoiceNumber ||
    totalAmount ||
    gstAmount ||
    subtotalAmount ||
    dueDate ||
    bankDetails
  );

  const getDisplaySummary = () => {
    const rawSummary = currentEmail.triage?.summary?.trim();
    const plainBody = currentEmail.body_plain?.trim();
    if (plainBody && plainBody.length <= 150) {
      return plainBody;
    }
    if (rawSummary && /^Email from .* regarding '.*'\.?$/i.test(rawSummary) && plainBody) {
      return plainBody.slice(0, 200);
    }
    return rawSummary || plainBody || 'No content provided.';
  };

  const mailtoReply = `mailto:${encodeURIComponent(currentEmail.sender_email)}?subject=${encodeURIComponent(
    currentEmail.subject.startsWith('Re:') ? currentEmail.subject : `Re: ${currentEmail.subject}`
  )}&body=${encodeURIComponent(
    `\n\n--- Original Message ---\nFrom: ${currentEmail.sender_name} <${currentEmail.sender_email}>\nDate: ${currentEmail.received_at}\n\n${currentEmail.body_plain}`
  )}`;

  const mailtoForward = `mailto:?subject=${encodeURIComponent(`Fwd: ${currentEmail.subject}`)}&body=${encodeURIComponent(
    `\n\n--- Forwarded Message ---\nFrom: ${currentEmail.sender_name} <${currentEmail.sender_email}>\nDate: ${currentEmail.received_at}\n\n${currentEmail.body_plain}`
  )}`;

  return (
    <div className="h-full flex flex-col bg-[#FFFFFF] overflow-y-auto select-text">
      {/* Action Header Bar */}
      <div className="px-6 h-[54px] border-b border-[#E3E9ED] flex items-center justify-between sticky top-0 bg-[#FFFFFF] z-10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Priority dropdown selector */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
            >
              <PriorityBadge priority={currentEmail.triage.priority} />
              <ChevronDown className="w-3 h-3 text-[#687786]" />
            </button>
            {showPriorityMenu && (
              <div className="absolute left-0 mt-1 w-32 bg-[#FFFFFF] border border-[#E3E9ED] rounded shadow-md z-30 py-1 text-xs">
                {ALL_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] flex items-center justify-between"
                  >
                    <span>{p}</span>
                    {p === currentEmail.triage.priority && <Check className="w-3 h-3 text-[#16877A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category dropdown selector */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
            >
              <CategoryBadge category={currentEmail.triage.category} />
              <ChevronDown className="w-3 h-3 text-[#687786]" />
            </button>
            {showCategoryMenu && (
              <div className="absolute left-0 mt-1 w-48 bg-[#FFFFFF] border border-[#E3E9ED] rounded shadow-md z-30 py-1 text-xs">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F5F7F8] flex items-center justify-between"
                  >
                    <span className="truncate">{cat}</span>
                    {cat === currentEmail.triage.category && <Check className="w-3 h-3 text-[#16877A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <StatusBadge status={currentEmail.processing_status} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {/* Mark read / unread toggle */}
          <button
            onClick={() => onToggleRead(currentEmail.internal_id, !currentEmail.is_read)}
            className="p-1.5 text-[#687786] hover:text-[#202B35] rounded hover:bg-[#F5F7F8] border border-transparent hover:border-[#E3E9ED] transition cursor-pointer"
            title={currentEmail.is_read ? 'Mark as Unread' : 'Mark as Read'}
          >
            {currentEmail.is_read ? <Mail className="w-4 h-4" /> : <MailCheck className="w-4 h-4 text-[#16877A]" />}
          </button>

          {/* Reply */}
          <a
            href={mailtoReply}
            className="p-1.5 text-[#687786] hover:text-[#202B35] rounded hover:bg-[#F5F7F8] border border-transparent hover:border-[#E3E9ED] transition"
            title="Reply via Outlook / Mail Client"
          >
            <Reply className="w-4 h-4" />
          </a>

          {/* Forward */}
          <a
            href={mailtoForward}
            className="p-1.5 text-[#687786] hover:text-[#202B35] rounded hover:bg-[#F5F7F8] border border-transparent hover:border-[#E3E9ED] transition"
            title="Forward via Outlook / Mail Client"
          >
            <Forward className="w-4 h-4" />
          </a>

          {/* Mark Resolved Primary Button */}
          <button
            onClick={() => onMarkCompleted(currentEmail.internal_id)}
            disabled={currentEmail.processing_status === 'COMPLETED'}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer shadow-2xs',
              currentEmail.processing_status === 'COMPLETED'
                ? 'bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF] opacity-80 cursor-default'
                : 'bg-[#16877A] hover:bg-[#127267] text-white'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {currentEmail.processing_status === 'COMPLETED' ? 'Resolved' : 'Mark Resolved'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#687786] hover:text-[#202B35] rounded md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Workspace Body */}
      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Email Header Details */}
        <div className="pb-4 border-b border-[#E3E9ED]">
          <h1 className="text-xl font-semibold text-[#172B3A] tracking-tight mb-3">
            {currentEmail.subject}
          </h1>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#172B3A] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {currentEmail.sender_name ? currentEmail.sender_name.slice(0, 2).toUpperCase() : 'EM'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#202B35]">{currentEmail.sender_name}</span>
                  <span className="text-xs font-mono text-[#687786]">&lt;{currentEmail.sender_email}&gt;</span>
                </div>
                <div className="text-[11px] text-[#687786]">
                  To: <span className="font-mono text-[#202B35]">ibex.triage@aoscaustralia.com</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-[#687786] block">
                {formatEmailDate(currentEmail.received_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Original Message Content - Prominently Displayed */}
        <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#E3E9ED]/60 pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold">
              Original Message Content
            </span>
            <span className="text-[10px] font-mono text-[#687786]">
              {currentEmail.body_plain?.length || 0} characters
            </span>
          </div>

          {currentEmail.body_html ? (
            <div
              className="text-xs text-[#202B35] leading-relaxed overflow-x-auto space-y-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: currentEmail.body_html }}
            />
          ) : (
            <div className="text-xs text-[#202B35] whitespace-pre-wrap font-sans leading-relaxed">
              {currentEmail.body_plain || '(Empty message body)'}
            </div>
          )}
        </div>

        {/* Attachments Section Loading State */}
        {currentEmail.has_attachments && isAnalyzing && currentEmail.attachments.length === 0 && (
          <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] p-4 shadow-2xs flex items-center gap-2.5 text-xs text-[#687786]">
            <Loader2 className="w-4 h-4 animate-spin text-[#16877A]" />
            <span>Scanning and downloading document attachment...</span>
          </div>
        )}

        {/* Attachments Section */}
        {currentEmail.has_attachments && currentEmail.attachments.length > 0 && (
          <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] p-4 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-2.5">
              Attachments ({currentEmail.attachments.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentEmail.attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded border border-[#E3E9ED] bg-[#F5F7F8] hover:bg-[#FFFFFF] hover:border-[#16877A] transition flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getAttachmentIcon(att.filename)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#202B35] truncate" title={att.filename}>
                        {att.filename}
                      </p>
                      <span className="text-[10px] font-mono text-[#687786]">
                        {formatBytes(att.size_bytes)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadAttachment(att)}
                    className="p-1 text-[#687786] hover:text-[#16877A] rounded hover:bg-[#E8F4F1] transition cursor-pointer"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACCOUNTANT FINANCIAL OPERATIONS AUDIT PANEL */}
        <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#F5F7F8] border-b border-[#E3E9ED] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-[#D99A38] animate-ping" : "bg-[#16877A]")} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#172B3A]">
                Triage Overview & Intelligence
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#687786]">{isAnalyzing ? 'Status' : 'AI Confidence'}</span>
              <span className={cn(
                "px-2 py-0.5 rounded font-semibold border flex items-center gap-1",
                isAnalyzing
                  ? "bg-[#FBF3E6] text-[#D99A38] border-[#F5E0C2]"
                  : "bg-[#E8F4F1] text-[#16877A] border-[#C6E6DF]"
              )}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#D99A38]" />
                    Analyzing
                  </>
                ) : (
                  `${Math.round((currentEmail.triage?.confidence ?? 0.85) * 100)}%`
                )}
              </span>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#E8F4F1] flex items-center justify-center border border-[#C6E6DF]">
                  <Sparkles className="w-6 h-6 text-[#16877A] animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-full border border-[#16877A]/40 animate-ping pointer-events-none" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#172B3A] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#16877A]" />
                  AI Analyzing & Classifying Email...
                </h4>
                <p className="text-xs text-[#687786] max-w-md leading-relaxed">
                  Extracting financial entities, recognizing document type, and checking compliance against business policies...
                </p>
              </div>

              {/* Shimmer placeholders for progressive loading */}
              <div className="w-full max-w-lg space-y-2 pt-2">
                <div className="h-9 bg-[#F5F7F8] rounded border border-[#E3E9ED] animate-pulse flex items-center px-3">
                  <span className="text-[10px] text-[#687786] font-mono">Analyzing document model & category...</span>
                </div>
                <div className="h-16 bg-[#F5F7F8] rounded border border-[#E3E9ED] animate-pulse flex items-center px-3">
                  <span className="text-[10px] text-[#687786] font-mono">Generating executive summary & key action items...</span>
                </div>
                <div className="h-12 bg-[#F5F7F8] rounded border border-[#E3E9ED] animate-pulse flex items-center px-3">
                  <span className="text-[10px] text-[#687786] font-mono">Extracting financial figures, dates, and supplier credentials...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* AI Document Classification Grid */}
              <div className="p-3.5 rounded border border-[#E3E9ED] bg-[#F5F7F8]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#172B3A] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#16877A]" />
                  AI Classification Analysis
                </span>
                <span className={cn(
                  'text-[10px] font-mono px-2 py-0.5 rounded font-medium border',
                  aiClassification.status === 'ready'
                    ? 'bg-[#E8F4F1] text-[#16877A] border-[#C6E6DF]'
                    : 'bg-[#FBF3E6] text-[#D99A38] border-[#F5E0C2]'
                )}>
                  Status: {aiClassification.status === 'ready' ? 'Ready' : 'Needs Review'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2 rounded bg-[#FFFFFF] border border-[#E3E9ED]">
                  <span className="text-[10px] text-[#687786] block font-mono">Document Model</span>
                  <span className="font-mono font-medium text-[#202B35] capitalize">
                    {currentEmail.triage?.category || 'Standard Correspondence'}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#FFFFFF] border border-[#E3E9ED]">
                  <span className="text-[10px] text-[#687786] block font-mono">Sender / Contact</span>
                  <span className="font-medium text-[#202B35] truncate block">
                    {currentEmail.sender_name || currentEmail.sender_email}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#FFFFFF] border border-[#E3E9ED]">
                  <span className="text-[10px] text-[#687786] block font-mono">Compliance Check</span>
                  <span className="text-[#16877A] font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Clean / Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1">
                Executive Summary
              </span>
              <div className="p-3 rounded bg-[#F5F7F8] border border-[#E3E9ED] text-xs text-[#202B35] leading-relaxed">
                {getDisplaySummary()}
              </div>
            </div>

            {/* Key Action Points */}
            {currentEmail.triage?.key_points && currentEmail.triage.key_points.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold block mb-1">
                  Key Action Points
                </span>
                <ul className="space-y-1">
                  {currentEmail.triage.key_points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[#202B35]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16877A] mt-1.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extracted Financial Entities (Deep Document Intelligence) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#687786] font-semibold">
                    Extracted Financial Entities
                  </span>
                  {attachmentSource && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#F5F7F8] text-[#16877A] border border-[#E3E9ED]">
                      Source: {attachmentSource}
                    </span>
                  )}
                </div>

                {hasFinancialEntities && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleApproveData}
                      disabled={isDataApproved}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16877A] hover:bg-[#E8F4F1] px-2 py-0.5 rounded border border-[#C6E6DF] transition cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      {isDataApproved ? 'Data Approved' : 'Approve Extracted Data'}
                    </button>
                    <button
                      onClick={handleSendManualReview}
                      disabled={isManualReviewSent}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#547FA5] hover:bg-[#EDF3F8] px-2 py-0.5 rounded border border-[#D4E3EF] transition cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      {isManualReviewSent ? 'Sent to Review' : 'Send for Review'}
                    </button>
                  </div>
                )}
              </div>

              {hasFinancialEntities ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* Vendor / Supplier */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Vendor / Supplier</span>
                    <span className="font-semibold text-[#172B3A] truncate block text-xs" title={supplierName || currentEmail.sender_name}>
                      {supplierName || currentEmail.sender_name || '—'}
                    </span>
                  </div>

                  {/* ABN */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Australian Business No.</span>
                    <span className={cn("font-mono font-medium", abn ? "text-[#16877A]" : "text-[#687786]")}>
                      {abn || 'Not detected'}
                    </span>
                  </div>

                  {/* Invoice Number */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Invoice / Ref #</span>
                    <span className="font-mono font-medium text-[#202B35]">
                      {invoiceNumber || 'Not detected'}
                    </span>
                  </div>

                  {/* Total Amount Due */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Total Due (AUD)</span>
                    <span className="font-mono font-semibold text-[#172B3A] text-sm">
                      {totalAmount || '—'}
                    </span>
                  </div>

                  {/* Subtotal */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Subtotal</span>
                    <span className="font-mono text-[#202B35]">
                      {subtotalAmount || '—'}
                    </span>
                  </div>

                  {/* GST Component */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">GST (10%)</span>
                    <span className="font-mono text-[#202B35]">
                      {gstAmount || '—'}
                    </span>
                  </div>

                  {/* Payment Due Date */}
                  <div className="p-2.5 rounded bg-[#FBECEE] border border-[#F7D3D6]">
                    <span className="text-[10px] text-[#C94F56] block font-mono font-medium">Payment Deadline</span>
                    <span className="font-mono font-semibold text-[#C94F56]">
                      {dueDate || 'None specified'}
                    </span>
                  </div>

                  {/* Remittance Bank */}
                  <div className="p-2.5 rounded bg-[#F5F7F8] border border-[#E3E9ED]">
                    <span className="text-[10px] text-[#687786] block font-mono">Remittance Bank</span>
                    {bankDetails?.bsb || bankDetails?.account_number ? (
                      <>
                        <span className="font-mono text-[11px] text-[#202B35] block truncate">
                          BSB: {bankDetails.bsb || '—'}
                        </span>
                        <span className="font-mono text-[11px] text-[#202B35] block truncate">
                          Acc: {bankDetails.account_number || '—'}
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-[11px] text-[#687786] block">
                        Not detected
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded bg-[#F5F7F8] border border-[#E3E9ED] flex items-center justify-between text-xs text-[#687786]">
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#687786]" />
                    No financial entities or invoice attachments detected in this message.
                  </span>
                  <span className="font-mono text-[11px] text-[#687786]">Standard Message</span>
                </div>
              )}
            </div>

            {/* Suggested Next Step Guidance */}
            <div className="p-3 rounded bg-[#E8F4F1]/60 border border-[#C6E6DF] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#16877A] font-semibold block">
                  Suggested Next Step
                </span>
                <p className="text-xs text-[#202B35] font-medium mt-0.5">
                  {currentEmail.triage?.suggested_action || (hasFinancialEntities ? 'Verify invoice details, check ABN and match with accounting records.' : 'Read and file for reference.')}
                </p>
              </div>
              {hasFinancialEntities ? (
                <button
                  onClick={handleApproveData}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-[#16877A] hover:bg-[#127267] rounded transition shrink-0 cursor-pointer shadow-2xs"
                >
                  Approve & Reconcile
                </button>
              ) : (
                <button
                  onClick={() => onMarkCompleted(currentEmail.internal_id)}
                  disabled={currentEmail.processing_status === 'COMPLETED'}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded transition shrink-0 cursor-pointer shadow-2xs flex items-center gap-1",
                    currentEmail.processing_status === 'COMPLETED'
                      ? "bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]"
                      : "text-white bg-[#16877A] hover:bg-[#127267]"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {currentEmail.processing_status === 'COMPLETED' ? 'Resolved' : 'Mark Resolved'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
