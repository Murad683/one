import { createContext, useContext } from 'react';

export type DeliverableUploadPhase = 'idle' | 'uploading' | 'done' | 'error';

export interface DeliverableUploadValue {
  phase: DeliverableUploadPhase;
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
