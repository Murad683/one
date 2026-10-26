import { createContext, useContext } from 'react';

export type DeliverableUploadStatus = 'uploading' | 'done' | 'error';

export interface DeliverableUploadItem {
  id: number;
  label: string;
  pct: number;
  status: DeliverableUploadStatus;
  errorText: string;
}

/** How many "Layihə Faylları" uploads may run at the same time from one tab. */
export const MAX_PARALLEL_UPLOADS = 3;

export interface DeliverableUploadValue {
  /** Uploads currently in flight (finished/failed cards don't count). */
  activeCount: number;
  /** False once MAX_PARALLEL_UPLOADS are running; check before creating a record. */
  canStart: boolean;
  /**
   * Starts a background upload. `onFinished` runs when it succeeds or fails
   * (e.g. to refetch the list); it may run after the caller's page unmounted.
   */
  start: (deliverableId: string, files: File[], thumbnail: File | null, onFinished?: () => void) => void;
}

export const DeliverableUploadCtx = createContext<DeliverableUploadValue | null>(null);

export function useDeliverableUpload(): DeliverableUploadValue {
  const v = useContext(DeliverableUploadCtx);
  if (!v) throw new Error('useDeliverableUpload must be used within DeliverableUploadProvider');
  return v;
}
