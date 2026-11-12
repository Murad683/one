/**
 * Upload tracking rules (DeliverableUpload rows). Pure: no database access, so every rule can be
 * tested. The browser reports started / progress / assembled; this file turns the newest row of a
 * deliverable into the state the admin list shows.
 */

export const UPLOAD_STATUSES = ['UPLOADING', 'ASSEMBLED', 'FINALIZED', 'ABORTED', 'EXPIRED'] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

/** No sign of life for this long: the upload looks cut off (the tab may still resume it). */
export const UPLOAD_STALLED_AFTER_MS = 3 * 60 * 1000;
/** The whole file is in storage but finalize has not been called for this long. */
export const UPLOAD_UNFINALIZED_AFTER_MS = 2 * 60 * 1000;
/** An upload with no activity for this long is given up on by the hourly job. */
export const UPLOAD_EXPIRE_AFTER_MS = 6 * 60 * 60 * 1000;
/** Multipart uploads in storage that no row knows about are only reported after this long. */
export const UNTRACKED_REPORT_AFTER_MS = 48 * 60 * 60 * 1000;

/** What the admin list shows for one deliverable. `null` = nothing to say. */
export type UploadState = 'uploading' | 'stalled' | 'unfinalized' | 'expired';
export const PROBLEM_STATES: readonly UploadState[] = ['stalled', 'unfinalized', 'expired'];

export interface UploadRowLike {
  status: string;
  progress: number;
  lastActivityAt: Date;
  endedAt: Date | null;
  reason: string | null;
}

export interface UploadView {
  state: UploadState;
  progress: number;
  reason: string | null;
  at: Date;
}

/**
 * State of a deliverable from its newest upload row. A later successful upload (FINALIZED) or no
 * row at all gives null. Ended uploads (ABORTED/EXPIRED) only matter while the row has no file,
 * otherwise the old file is still there and nothing is lost.
 */
export const uploadViewOf = (
  latest: UploadRowLike | null | undefined,
  hasFiles: boolean,
  now: number = Date.now(),
): UploadView | null => {
  if (!latest) return null;
  const idle = now - latest.lastActivityAt.getTime();
  switch (latest.status) {
    case 'UPLOADING':
      return {
        state: idle > UPLOAD_STALLED_AFTER_MS ? 'stalled' : 'uploading',
        progress: latest.progress,
        reason: null,
        at: latest.lastActivityAt,
      };
    case 'ASSEMBLED':
      return {
        state: idle > UPLOAD_UNFINALIZED_AFTER_MS ? 'unfinalized' : 'uploading',
        progress: 100,
        reason: null,
        at: latest.lastActivityAt,
      };
    case 'ABORTED':
    case 'EXPIRED':
      if (hasFiles) return null;
      return {
        state: 'expired',
        progress: latest.progress,
        reason: latest.reason,
        at: latest.endedAt ?? latest.lastActivityAt,
      };
    default:
      return null;
  }
};

export const isProblem = (view: UploadView | null): boolean => !!view && PROBLEM_STATES.includes(view.state);

/** Text stored when the hourly job gives up on a cut-off upload (shown in the admin list). */
export const EXPIRED_REASON = 'Yükləmə 6 saatdan çox dayanıb, yarımçıq hissələr ləğv edildi.';
export const ABORTED_REASON = 'Yükləmə xəta ilə dayandı.';

export type UploadCleanupMode = 'off' | 'dry-run' | 'on';

/** UPLOAD_CLEANUP_MODE in backend/.env: off (default) | dry-run (log only) | on. */
export const getUploadCleanupMode = (env: NodeJS.ProcessEnv = process.env): UploadCleanupMode => {
  const value = (env.UPLOAD_CLEANUP_MODE || '').trim().toLowerCase();
  if (value === 'on' || value === 'dry-run') return value;
  return 'off';
};

/** At most this many uploads are given up on in one run. */
export const MAX_EXPIRES_PER_RUN = 20;
/** More than this waiting at once is unexpected: the job cancels nothing and warns. */
export const EXPIRE_ANOMALY_LIMIT = 50;
