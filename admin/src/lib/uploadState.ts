/** What the server knows about a deliverable's upload (backend/src/utils/deliverableUploads.ts). */
export type UploadState = 'uploading' | 'stalled' | 'unfinalized' | 'expired';

/** Cut off, finished but not processed, or cancelled: the admin has to do something. */
export const isUploadProblem = (state?: UploadState | null): boolean =>
  state === 'stalled' || state === 'unfinalized' || state === 'expired';
