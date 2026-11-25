import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-[#E3E9ED] bg-[#FFFFFF]">
      <div className="flex items-center justify-center w-10 h-10 mb-3 rounded bg-[#F5F7F8] text-[#16877A] border border-[#E3E9ED]">
        <Icon className="w-5 h-5 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold text-[#172B3A]">{title}</h3>
      <p className="max-w-xs mt-1 text-xs text-[#687786]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
      {actionText && onAction && !action && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#16877A] hover:bg-[#127267] rounded transition cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
