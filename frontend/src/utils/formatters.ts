import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    // Handle future or immediate arrivals (e.g. clock skew)
    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    const currentYear = now.getFullYear();
    if (date.getFullYear() === currentYear) {
      return format(date, 'MMM d');
    }
    return format(date, 'dd/MM/yyyy');
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
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy • h:mm a');
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

// Enterprise status styling (Linear & Stripe professional palette)
export function getPriorityColor(priority: string): { bg: string; text: string; border: string; dot: string } {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-[#FBECEE]',
        text: 'text-[#C94F56] font-semibold',
        border: 'border-[#F7D3D6]',
        dot: 'bg-[#C94F56]',
      };
    case 'high':
      return {
        bg: 'bg-[#FBF3E6]',
        text: 'text-[#D99A38] font-semibold',
        border: 'border-[#F5E0C2]',
        dot: 'bg-[#D99A38]',
      };
    case 'medium':
      return {
        bg: 'bg-[#EDF3F8]',
        text: 'text-[#547FA5] font-semibold',
        border: 'border-[#D4E3EF]',
        dot: 'bg-[#547FA5]',
      };
    case 'low':
    default:
      return {
        bg: 'bg-[#F5F7F8]',
        text: 'text-[#687786] font-medium',
        border: 'border-[#E3E9ED]',
        dot: 'bg-[#687786]',
      };
  }
}

// Enterprise category badges
export function getCategoryBadge(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'Action Required':
      return {
        bg: 'bg-[#FBF3E6]',
        text: 'text-[#D99A38]',
        border: 'border-[#F5E0C2]',
      };
    case 'Urgent':
      return {
        bg: 'bg-[#FBECEE]',
        text: 'text-[#C94F56]',
        border: 'border-[#F7D3D6]',
      };
    case 'Invoice / Finance':
      return {
        bg: 'bg-[#E8F4F1]',
        text: 'text-[#16877A]',
        border: 'border-[#C6E6DF]',
      };
    case 'Client Communication':
      return {
        bg: 'bg-[#EDF3F8]',
        text: 'text-[#547FA5]',
        border: 'border-[#D4E3EF]',
      };
    case 'Meeting / Scheduling':
      return {
        bg: 'bg-[#EDF3F8]',
        text: 'text-[#172B3A]',
        border: 'border-[#E3E9ED]',
      };
    case 'Follow-up Required':
      return {
        bg: 'bg-[#FBF3E6]',
        text: 'text-[#D99A38]',
        border: 'border-[#F5E0C2]',
      };
    case 'Information / FYI':
      return {
        bg: 'bg-[#EDF3F8]',
        text: 'text-[#547FA5]',
        border: 'border-[#D4E3EF]',
      };
    case 'Technical Issue':
      return {
        bg: 'bg-[#F0F4F6]',
        text: 'text-[#687786]',
        border: 'border-[#E3E9ED]',
      };
    case 'Spam / Unwanted':
      return {
        bg: 'bg-[#F5F7F8]',
        text: 'text-[#8A99A8]',
        border: 'border-[#E3E9ED]',
      };
    default:
      return {
        bg: 'bg-[#F5F7F8]',
        text: 'text-[#687786]',
        border: 'border-[#E3E9ED]',
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
