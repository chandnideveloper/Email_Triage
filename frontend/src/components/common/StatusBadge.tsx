import React from 'react';
import { Loader2 } from 'lucide-react';
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
      case 'COMPLETED':
        return {
          label: status === 'ATTACHMENTS_PROCESSED' ? 'Attachments Synced' : status === 'COMPLETED' ? 'Resolved' : 'Triaged',
          bg: 'bg-[#E8F4F1] text-[#16877A] border-[#C6E6DF]',
          isSpinning: false,
        };
      case 'PENDING':
      case 'INGESTED':
        return {
          label: 'Analyzing...',
          bg: 'bg-[#FBF3E6] text-[#D99A38] border-[#F5E0C2]',
          isSpinning: true,
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bg: 'bg-[#FBECEE] text-[#C94F56] border-[#F7D3D6]',
          isSpinning: false,
        };
      case 'RETRYING':
        return {
          label: 'Retrying',
          bg: 'bg-[#FBF3E6] text-[#D99A38] border-[#F5E0C2]',
          isSpinning: true,
        };
      default:
        return {
          label: 'Pending',
          bg: 'bg-[#F5F7F8] text-[#687786] border-[#E3E9ED]',
          isSpinning: false,
        };
    }
  })();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-[4px] border select-none',
        config.bg,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      )}
    >
      {config.isSpinning && <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      {config.label}
    </span>
  );
};
