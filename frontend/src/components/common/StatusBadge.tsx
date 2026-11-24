import React from 'react';
import { ProcessingStatus } from '@/types';
import { cn } from '@/utils/cn';

interface StatusBadgeProps {
  status: ProcessingStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = (() => {
    switch (status) {
      case 'TRIAGED':
      case 'ATTACHMENTS_PROCESSED':
        return {
          label: status === 'ATTACHMENTS_PROCESSED' ? 'Attachments Synced' : 'Triaged',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'INGESTED':
        return {
          label: 'Ingested',
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        };
      case 'RETRYING':
        return {
          label: 'Retrying',
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
      default:
        return {
          label: 'Pending',
          bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        };
    }
  })();

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.bg,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      )}
    >
      {config.label}
    </span>
  );
};
