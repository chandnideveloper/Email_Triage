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
  Filter,
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
  receivedAt: string;
};

export const Attachments: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<EnrichedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

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

  const filtered = useMemo(() => {
    return attachments.filter((att) => {
      const matchSearch =
        att.filename.toLowerCase().includes(search.toLowerCase()) ||
        att.parentSubject.toLowerCase().includes(search.toLowerCase()) ||
        att.parentSender.toLowerCase().includes(search.toLowerCase()) ||
        att.sha256.toLowerCase().includes(search.toLowerCase());

      const ext = att.filename.split('.').pop()?.toLowerCase();
      let matchType = true;
      if (selectedType === 'pdf') matchType = ext === 'pdf';
      else if (selectedType === 'sheet') matchType = ['xlsx', 'xls', 'csv'].includes(ext || '');
      else if (selectedType === 'doc') matchType = ['docx', 'doc'].includes(ext || '');

      return matchSearch && matchType;
    });
  }, [attachments, search, selectedType]);

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
            Practice document management, automated extraction, and financial verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            placeholder="Search filenames, senders, or SHA-256..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F5F7F8] border border-[#E3E9ED] rounded outline-none focus:border-[#16877A] text-[#202B35] placeholder:text-[#687786]"
          />
        </div>

        {/* File Type Filter Tabs */}
        <div className="flex items-center gap-1.5 text-xs">
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
        </div>
      </div>

      {/* Document Data Table */}
      <div className="rounded-lg border border-[#E3E9ED] bg-[#FFFFFF] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-[#F5F7F8] rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="No extracted documents match your current filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F8] border-b border-[#E3E9ED] text-[#687786] font-medium font-mono text-[11px]">
                  <th className="py-2.5 px-4">Document Name</th>
                  <th className="py-2.5 px-4">Associated Email</th>
                  <th className="py-2.5 px-4">Client / Sender</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">SHA-256 Fingerprint</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E9ED]">
                {filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-[#F5F7F8] transition group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {renderIcon(att.filename)}
                        <div>
                          <p className="font-medium text-[#202B35] truncate max-w-xs">{att.filename}</p>
                          <span className="text-[10px] font-mono text-[#687786]">{formatBytes(att.size_bytes)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-[#202B35] truncate max-w-xs font-medium">{att.parentSubject}</p>
                      <span className="text-[10px] font-mono text-[#687786]">
                        {formatRelativeTime(att.receivedAt)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#202B35] font-medium">
                      {att.parentSender || 'Ayushi Singh'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#F5F7F8] border border-[#E3E9ED] text-[#172B3A] font-medium">
                        {att.filename.split('.').pop()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16877A] bg-[#E8F4F1] border border-[#C6E6DF] px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[10px] text-[#687786] max-w-[140px] truncate" title={att.sha256}>
                      {att.sha256}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(att)}
                          className="p-1.5 text-[#687786] hover:text-[#16877A] hover:bg-[#E8F4F1] rounded transition cursor-pointer"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {att.email_internal_id && (
                          <button
                            onClick={() => navigate(`/inbox?id=${att.email_internal_id}`)}
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
        )}
      </div>
    </div>
  );
};
