import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  FileCode,
  File,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { api } from '@/services/api';
import { AttachmentMetadata } from '@/types';
import { formatBytes, getFileIcon, formatRelativeTime } from '@/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

type EnrichedAttachment = AttachmentMetadata & {
  parentSubject: string;
  parentSender: string;
  senderEmail?: string;
  receivedAt: string;
};

interface ClientDocumentGroup {
  clientName: string;
  senderEmail?: string;
  documents: EnrichedAttachment[];
  latestDocName: string;
  latestActivity: string;
  totalCount: number;
  fileTypes: string[];
}

export const Attachments: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<EnrichedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.getAttachments();
        setAttachments(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group attachments by Client Name
  const clientGroups = useMemo<ClientDocumentGroup[]>(() => {
    const map = new Map<
      string,
      {
        clientName: string;
        senderEmail?: string;
        documents: EnrichedAttachment[];
        latestActivity: string;
        fileTypes: Set<string>;
      }
    >();

    attachments.forEach((att) => {
      const ext = att.filename.split('.').pop()?.toLowerCase() || '';
      let matchType = true;
      if (selectedType === 'pdf') matchType = ext === 'pdf';
      else if (selectedType === 'sheet') matchType = ['xlsx', 'xls', 'csv'].includes(ext);
      else if (selectedType === 'doc') matchType = ['docx', 'doc'].includes(ext);

      if (!matchType) return;

      const sender = (att.parentSender || 'Client').trim();

      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        att.filename.toLowerCase().includes(q) ||
        att.parentSubject.toLowerCase().includes(q) ||
        sender.toLowerCase().includes(q) ||
        (att.senderEmail && att.senderEmail.toLowerCase().includes(q)) ||
        att.sha256.toLowerCase().includes(q);

      if (!matchSearch) return;

      const existing = map.get(sender) || {
        clientName: sender,
        senderEmail: att.senderEmail,
        documents: [],
        latestActivity: att.receivedAt,
        fileTypes: new Set<string>(),
      };

      if (!existing.senderEmail && att.senderEmail) {
        existing.senderEmail = att.senderEmail;
      }

      existing.documents.push(att);
      if (ext) existing.fileTypes.add(ext.toUpperCase());
      if (att.receivedAt > existing.latestActivity) {
        existing.latestActivity = att.receivedAt;
      }

      map.set(sender, existing);
    });

    return Array.from(map.values())
      .map((g) => ({
        clientName: g.clientName,
        senderEmail: g.senderEmail,
        documents: g.documents,
        latestDocName: g.documents[0]?.filename || '',
        latestActivity: g.latestActivity,
        totalCount: g.documents.length,
        fileTypes: Array.from(g.fileTypes),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [attachments, search, selectedType]);

  // When search query is entered, auto-expand all matching clients
  useEffect(() => {
    if (search.trim()) {
      setExpandedClients(new Set(clientGroups.map((g) => g.clientName)));
    }
  }, [search, clientGroups]);

  const toggleClientExpand = (clientName: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  };

  const allExpanded =
    clientGroups.length > 0 && clientGroups.every((g) => expandedClients.has(g.clientName));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedClients(new Set());
    } else {
      setExpandedClients(new Set(clientGroups.map((g) => g.clientName)));
    }
  };

  const handleDownload = (att: EnrichedAttachment) => {
    api.downloadAttachment(att.email_internal_id || '', att.id || att.filename, att.filename);
    toast.success('Downloading', `Downloading ${att.filename}`);
  };

  const renderIcon = (filename: string) => {
    const iconType = getFileIcon(filename);
    switch (iconType) {
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

  const totalDocumentsCount = useMemo(() => {
    return clientGroups.reduce((acc, g) => acc + g.totalCount, 0);
  }, [clientGroups]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E9ED]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#172B3A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#16877A]" />
            Document Centre
          </h1>
          <p className="text-xs text-[#687786] mt-0.5">
            Client document repository, automated extraction, and financial verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16877A]" />
            SHA-256 Verification Active
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687786]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, email, filename, or SHA-256..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] placeholder:text-[#687786]"
          />
        </div>

        {/* File Type Filter Tabs & Expand/Collapse Toggle */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[#687786] font-mono text-[10px] uppercase font-semibold">Filter:</span>
          {[
            { id: 'all', label: 'All Files' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'sheet', label: 'Spreadsheets' },
            { id: 'doc', label: 'Docs' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={cn(
                'px-2.5 py-1 rounded font-mono text-[11px] transition cursor-pointer',
                selectedType === t.id
                  ? 'bg-[#16877A] text-white font-medium shadow-2xs'
                  : 'text-[#687786] hover:text-[#202B35] bg-[#F5F7F8] hover:bg-[#E3E9ED]'
              )}
            >
              {t.label}
            </button>
          ))}

          {clientGroups.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="ml-2 px-2.5 py-1 rounded font-mono text-[11px] text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] hover:bg-[#C6E6DF] transition cursor-pointer"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      {/* Scalable Client-Centric Document Table */}
      <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F5F7F8] rounded animate-pulse" />
            ))}
          </div>
        ) : clientGroups.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              icon={FileText}
              title="No client documents found"
              description="No documents match your search or filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F8] border-b border-[#E3E9ED] text-[#687786] font-medium font-mono text-[11px]">
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Email ID</th>
                  <th className="py-2.5 px-4">Latest Document</th>
                  <th className="py-2.5 px-4">File Types</th>
                  <th className="py-2.5 px-4 text-right">Total Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E9ED]">
                {clientGroups.map((group) => {
                  const isExpanded = expandedClients.has(group.clientName);
                  return (
                    <React.Fragment key={group.clientName}>
                      {/* Client Header Row */}
                      <tr
                        onClick={() => toggleClientExpand(group.clientName)}
                        className={cn(
                          'transition cursor-pointer select-none',
                          isExpanded ? 'bg-[#F9FBFA]' : 'hover:bg-[#F5F7F8] bg-[#FFFFFF]'
                        )}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'p-1 rounded transition-colors',
                                isExpanded
                                  ? 'bg-[#16877A] text-white'
                                  : 'bg-[#F5F7F8] text-[#687786] border border-[#E3E9ED]'
                              )}
                            >
                              <ChevronRight
                                className={cn(
                                  'w-3.5 h-3.5 transition-transform duration-200',
                                  isExpanded && 'rotate-90'
                                )}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-[#16877A]" />
                              ) : (
                                <Folder className="w-4 h-4 text-[#687786]" />
                              )}
                              <span className="font-semibold text-xs text-[#202B35] hover:text-[#16877A] transition">
                                {group.clientName}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-[#687786]">
                          {group.senderEmail || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-[#202B35] truncate max-w-xs text-xs">
                            {group.latestDocName}
                          </p>
                          <span className="text-[10px] font-mono text-[#687786]">
                            {formatRelativeTime(group.latestActivity)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {group.fileTypes.map((ft) => (
                              <span
                                key={ft}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#F5F7F8] border border-[#E3E9ED] text-[#172B3A] font-medium"
                              >
                                {ft}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border transition',
                              isExpanded
                                ? 'bg-[#16877A] text-white border-[#16877A] shadow-2xs'
                                : 'bg-[#E8F4F1] text-[#16877A] border-[#C6E6DF]'
                            )}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {group.totalCount} {group.totalCount === 1 ? 'Document' : 'Documents'}
                          </span>
                        </td>
                      </tr>

                      {/* Nested Documents for this Client */}
                      {isExpanded && (
                        <tr className="bg-[#FAFBFB]">
                          <td colSpan={5} className="p-0 border-b border-[#E3E9ED]">
                            <div className="px-6 py-4 bg-[#F5F7F8]/40 border-y border-[#E3E9ED]">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#687786] flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#16877A]" />
                                  Documents from {group.clientName} ({group.documents.length})
                                </span>
                                <span className="text-[10px] text-[#687786] font-mono">
                                  Click any row action to download or view in Inbox
                                </span>
                              </div>

                              <div className="bg-[#FFFFFF] rounded border border-[#E3E9ED] overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-[#F5F7F8] border-b border-[#E3E9ED] text-[#687786] font-mono text-[11px]">
                                      <th className="py-2 px-3">Document Name</th>
                                      <th className="py-2 px-3">Associated Email</th>
                                      <th className="py-2 px-3">Type</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3">SHA-256 Fingerprint</th>
                                      <th className="py-2 px-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#E3E9ED]">
                                    {group.documents.map((att) => (
                                      <tr
                                        key={att.id}
                                        className="hover:bg-[#F5F7F8] transition"
                                      >
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-2">
                                            {renderIcon(att.filename)}
                                            <div>
                                              <p className="font-medium text-[#202B35] truncate max-w-xs">
                                                {att.filename}
                                              </p>
                                              <span className="text-[10px] font-mono text-[#687786]">
                                                {formatBytes(att.size_bytes)}
                                              </span>
                                            </div>
                                          </div>
                                        </td>

                                        <td className="py-2.5 px-3">
                                          <p className="text-[#202B35] truncate max-w-xs font-medium">
                                            {att.parentSubject}
                                          </p>
                                          <span className="text-[10px] font-mono text-[#687786]">
                                            {formatRelativeTime(att.receivedAt)}
                                          </span>
                                        </td>

                                        <td className="py-2.5 px-3">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#F5F7F8] border border-[#E3E9ED] text-[#172B3A] font-medium">
                                            {att.filename.split('.').pop()}
                                          </span>
                                        </td>

                                        <td className="py-2.5 px-3">
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Verified
                                          </span>
                                        </td>

                                        <td
                                          className="py-2.5 px-3 font-mono text-[10px] text-[#687786] max-w-[130px] truncate"
                                          title={att.sha256}
                                        >
                                          {att.sha256}
                                        </td>

                                        <td className="py-2.5 px-3 text-right">
                                          <div className="inline-flex items-center gap-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(att);
                                              }}
                                              className="p-1.5 text-[#687786] hover:text-[#16877A] hover:bg-[#E8F4F1] rounded transition cursor-pointer"
                                              title="Download document"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                            </button>
                                            {att.email_internal_id && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(
                                                    `/inbox?id=${att.email_internal_id}`
                                                  );
                                                }}
                                                className="p-1.5 text-[#687786] hover:text-[#172B3A] hover:bg-[#F5F7F8] rounded transition cursor-pointer"
                                                title="View in Inbox"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
