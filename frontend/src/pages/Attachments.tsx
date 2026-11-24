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

  const handleDownload = (filename: string) => {
    toast.success('Downloaded', `Saved ${filename} from storage repository.`);
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
    <div className="p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-zinc-500" />
            Extracted Documents & Attachments
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Indexed email attachments with SHA-256 deduplication and verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            SHA-256 Deduplication Active
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames, senders, or hashes..."
            className="w-full pl-7 pr-4 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* File Type Filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-zinc-400 font-mono text-[10px] px-1 uppercase">Type:</span>
          {['all', 'pdf', 'sheet', 'doc'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2 py-0.5 rounded font-mono text-[11px] uppercase transition ${
                selectedType === t
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Attachments Table */}
      <div className="rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#121316] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-850 rounded animate-pulse" />
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
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-4">Parent Email</th>
                  <th className="py-2.5 px-4">Sender</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">SHA-256 Checksum</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {filtered.map((att) => (
                  <tr
                    key={att.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-850/40 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          {renderIcon(att.filename)}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                            {att.filename}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">{att.content_type}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 max-w-xs truncate">
                      {att.parentSubject}
                    </td>

                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {att.parentSender}
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {formatBytes(att.size_bytes)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[10px] text-zinc-400">
                      {att.sha256.slice(0, 16)}...
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownload(att.filename)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
