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

// Clean, understated priority styles (Linear/Stripe-inspired, non-gimmicky)
export function getPriorityColor(priority: string): { bg: string; text: string; border: string; dot: string } {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-red-500/10 dark:bg-red-500/15',
        text: 'text-red-700 dark:text-red-400 font-medium',
        border: 'border-red-500/25 dark:border-red-500/30',
        dot: 'bg-red-500',
      };
    case 'high':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-800 dark:text-amber-300 font-medium',
        border: 'border-amber-500/25 dark:border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'medium':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        text: 'text-blue-800 dark:text-blue-300 font-medium',
        border: 'border-blue-500/25 dark:border-blue-500/30',
        dot: 'bg-blue-500',
      };
    case 'low':
    default:
      return {
        bg: 'bg-zinc-100 dark:bg-zinc-800/70',
        text: 'text-zinc-600 dark:text-zinc-400 font-medium',
        border: 'border-zinc-200 dark:border-zinc-700/60',
        dot: 'bg-zinc-400',
      };
  }
}

// Understated, editorial category badges
export function getCategoryBadge(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'Action Required':
    case 'Urgent':
      return {
        bg: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
        text: '',
        border: 'border-transparent',
      };
    case 'Invoice / Finance':
      return {
        bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        text: '',
        border: 'border-emerald-200 dark:border-emerald-800/60',
      };
    case 'Client Communication':
      return {
        bg: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
        text: '',
        border: 'border-zinc-200 dark:border-zinc-700',
      };
    case 'Meeting / Scheduling':
      return {
        bg: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
        text: '',
        border: 'border-purple-200 dark:border-purple-800/60',
      };
    case 'Technical Issue':
      return {
        bg: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
        text: '',
        border: 'border-orange-200 dark:border-orange-800/60',
      };
    case 'Follow-up Required':
      return {
        bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        text: '',
        border: 'border-amber-200 dark:border-amber-800/60',
      };
    case 'Information / FYI':
      return {
        bg: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400',
        text: '',
        border: 'border-zinc-200 dark:border-zinc-700',
      };
    case 'Spam / Unwanted':
      return {
        bg: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500',
        text: '',
        border: 'border-zinc-200 dark:border-zinc-800',
      };
    default:
      return {
        bg: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        text: '',
        border: 'border-zinc-200 dark:border-zinc-700',
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
