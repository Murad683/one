export const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  VIDEO_1: 'Video 1',
  VIDEO_2: 'Video 2',
  DESIGNS: 'Designs',
  OTHER: 'Other',
};

export const DELIVERABLE_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }
> = {
  PENDING: { label: 'Pending', variant: 'neutral' },
  PROCESSING: { label: 'Processing', variant: 'warning' },
  READY: { label: 'Ready', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'error' },
};

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const formatFileSize = (bytes?: number | string | null): string => {
  if (bytes == null) return '—';
  
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes) || numBytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDeliverableAcceptedFiles = (type: string): string => {
  switch (type) {
    case 'VIDEO_1':
    case 'VIDEO_2':
      return 'video/mp4,video/quicktime,video/x-msvideo';
    case 'DESIGNS':
      return 'application/zip,application/pdf,image/jpeg,image/png,image/webp';
    case 'OTHER':
    default:
      return '*';
  }
};
