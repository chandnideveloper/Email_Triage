import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function formatEmailDate(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return dateString;
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'h:mm a');
    }
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return dateString;
  }
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Modern refined priority styles (High-contrast, vibrant, executive-grade)
export function getPriorityColor(priority: string): { bg: string; text: string; border: string; dot: string } {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        text: 'text-rose-600 dark:text-rose-400 font-semibold',
        border: 'border-rose-500/30 dark:border-rose-500/40',
        dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]',
      };
    case 'high':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-600 dark:text-amber-400 font-semibold',
        border: 'border-amber-500/30 dark:border-amber-500/40',
        dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
      };
    case 'medium':
      return {
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
        text: 'text-indigo-600 dark:text-indigo-400 font-semibold',
        border: 'border-indigo-500/30 dark:border-indigo-500/40',
        dot: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]',
      };
    case 'low':
    default:
      return {
        bg: 'bg-slate-500/10 dark:bg-slate-500/15',
        text: 'text-slate-600 dark:text-slate-400 font-medium',
        border: 'border-slate-500/25 dark:border-slate-500/30',
        dot: 'bg-slate-400',
      };
  }
}

// Modern, refined category badges
export function getCategoryBadge(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'Action Required':
    case 'Urgent':
      return {
        bg: 'bg-rose-500/15 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-medium',
        text: '',
        border: 'border-rose-500/30 dark:border-rose-800/60',
      };
    case 'Invoice / Finance':
      return {
        bg: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium',
        text: '',
        border: 'border-emerald-500/30 dark:border-emerald-800/60',
      };
    case 'Client Communication':
      return {
        bg: 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium',
        text: '',
        border: 'border-indigo-500/30 dark:border-indigo-800/60',
      };
    case 'Meeting / Scheduling':
      return {
        bg: 'bg-purple-500/15 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-medium',
        text: '',
        border: 'border-purple-500/30 dark:border-purple-800/60',
      };
    case 'Technical Issue':
      return {
        bg: 'bg-orange-500/15 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 font-medium',
        text: '',
        border: 'border-orange-500/30 dark:border-orange-800/60',
      };
    case 'Follow-up Required':
      return {
        bg: 'bg-cyan-500/15 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 font-medium',
        text: '',
        border: 'border-cyan-500/30 dark:border-cyan-800/60',
      };
    case 'Information / FYI':
      return {
        bg: 'bg-slate-500/15 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 font-medium',
        text: '',
        border: 'border-slate-500/25 dark:border-slate-700/60',
      };
    case 'Spam / Unwanted':
      return {
        bg: 'bg-zinc-500/10 text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-500 font-medium',
        text: '',
        border: 'border-zinc-500/20 dark:border-zinc-800',
      };
    default:
      return {
        bg: 'bg-slate-500/15 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium',
        text: '',
        border: 'border-slate-500/25 dark:border-slate-700',
      };
  }
}

export function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'xlsx':
    case 'xls':
    case 'csv': return 'sheet';
    case 'docx':
    case 'doc': return 'doc';
    case 'png':
    case 'jpg':
    case 'jpeg': return 'image';
    default: return 'file';
  }
}
