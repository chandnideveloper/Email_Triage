import React, { useEffect, useState, useMemo } from 'react';
import {
  Paperclip,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  File,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/services/api';
import { AttachmentMetadata } from '@/types';
import { formatBytes, getFileIcon } from '@/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/components/ui/Toast';

type EnrichedAttachment = AttachmentMetadata & {
  parentSubject: string;
  parentSender: string;
  receivedAt: string;
};

export const Attachments: React.FC = () => {
  const toast = useToast();
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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-indigo-500" />
            Extracted Documents & Attachments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Indexed email attachments with SHA-256 deduplication and verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            SHA-256 Deduplication Active
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames, senders, or hashes..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition"
          />
        </div>

        {/* File Type Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-mono text-[10px] px-1 uppercase font-semibold">Type:</span>
          {['all', 'pdf', 'sheet', 'doc'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] uppercase transition cursor-pointer ${
                selectedType === t
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Attachments Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111726] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Paperclip}
              title="No attachments found"
              description="No documents match your current filter query."
              actionText="Reset Filters"
              onAction={() => {
                setSearch('');
                setSelectedType('all');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Parent Email</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((att) => (
                  <tr
                    key={att.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-500 shadow-2xs">
                          {renderIcon(att.filename)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {att.filename}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{att.content_type}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate font-medium">
                      {att.parentSubject}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {att.parentSender}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {formatBytes(att.size_bytes)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {att.sha256.slice(0, 16)}...
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDownload(att)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/40 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
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
