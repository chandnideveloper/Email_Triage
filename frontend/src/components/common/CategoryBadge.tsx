import React from 'react';
import { getCategoryBadge } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  className,
}) => {
  const styles = getCategoryBadge(category);

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-[4px] border transition-colors select-none',
        styles.bg,
        styles.text,
        styles.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {category}
    </span>
  );
};
