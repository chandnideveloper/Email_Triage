import React from 'react';
import { Priority } from '@/types';
import { getPriorityColor } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface PriorityBadgeProps {
  priority: Priority | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showDot = true,
  className,
}) => {
  const styles = getPriorityColor(priority);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-[4px] border transition-colors select-none',
        styles.bg,
        styles.text,
        styles.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />}
      <span>{priority}</span>
    </span>
  );
};
