/**
 * Video retention rules, shared by the controllers and the hourly job
 * (jobs/retention.ts). Pure: no database access here.
 *
 * Lifecycle of a video deliverable:
 *   1. First time it is READY (visible in the portal): firstReadyAt = now,
 *      expiresAt = now + RETENTION_DAYS. Written once, never reset — replacing
 *      the video later does not extend it.
 *   2. expiresAt passed: hiddenAt = now. The client no longer sees it.
 *   3. PURGE_BUFFER_DAYS after hiddenAt: files deleted from storage,
 *      mediaDeletedAt = now. The row itself (title, client, feedback) stays.
 * Rows without a video file are never touched.
 */

export const RETENTION_DAYS = 60;
export const PURGE_BUFFER_DAYS = 7;
/** Files whose MIME type starts with one of these put a deliverable under the rule. */
export const RETENTION_MIME_PREFIXES = ['video/'];
/** At most this many deliverables lose their files in one run. */
export const MAX_PURGES_PER_RUN = 20;
/** More purges than this waiting at once is unexpected: the job deletes nothing and warns. */
export const PURGE_ANOMALY_LIMIT = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * RETENTION_MODE in backend/.env:
 *   off      (default) — nothing is stamped by the job, hidden or deleted; no countdown is shown.
 *   dry-run  — clocks start and the countdown shows, but the job only logs what it would hide/delete.
 *   on       — the job hides and deletes.
 */
export type RetentionMode = 'off' | 'dry-run' | 'on';

export const getRetentionMode = (env: NodeJS.ProcessEnv = process.env): RetentionMode => {
  const value = (env.RETENTION_MODE || '').trim().toLowerCase();
  if (value === 'on' || value === 'dry-run') return value;
  return 'off';
};

/** True when the files list holds at least one file of a retained type (a video). */
export const hasRetainedMedia = (files: unknown): boolean => {
  if (!Array.isArray(files)) return false;
  return files.some((f) => {
    const type = f && typeof f === 'object' ? (f as { type?: unknown }).type : undefined;
    return typeof type === 'string' && RETENTION_MIME_PREFIXES.some((p) => type.toLowerCase().startsWith(p));
  });
};

export const computeExpiresAt = (firstReadyAt: Date): Date =>
  new Date(firstReadyAt.getTime() + RETENTION_DAYS * DAY_MS);

/** Rows hidden at or before this moment are due for file deletion. */
export const purgeCutoff = (now: Date): Date => new Date(now.getTime() - PURGE_BUFFER_DAYS * DAY_MS);

/** When the files of a hidden row will be deleted. */
export const purgeAtFor = (hiddenAt: Date): Date => new Date(hiddenAt.getTime() + PURGE_BUFFER_DAYS * DAY_MS);

interface RetentionRow {
  hiddenAt?: Date | string | null;
  mediaDeletedAt?: Date | string | null;
}

/** Hidden from the client, or files already deleted: no new upload may go into it. */
export const isRetentionLocked = (row: RetentionRow): boolean => Boolean(row.hiddenAt || row.mediaDeletedAt);

export const RETENTION_LOCKED_MESSAGE =
  'Bu videonun saxlama müddəti bitib, ona yeni fayl yükləmək olmur. Yeni fayl yaradın.';

/** Prisma `where` part every client-facing query adds: hidden and purged rows never reach the client. */
export const CLIENT_VISIBLE_WHERE = { hiddenAt: null, mediaDeletedAt: null } as const;

/** What a client sees: only the deadline, and only while the rule is active. */
export const presentForClient = <T extends Record<string, unknown>>(row: T, mode: RetentionMode = getRetentionMode()) => {
  const { firstReadyAt, hiddenAt, mediaDeletedAt, expiresAt, ...rest } = row as T & {
    firstReadyAt?: unknown;
    hiddenAt?: unknown;
    mediaDeletedAt?: unknown;
    expiresAt?: unknown;
  };
  return { ...rest, expiresAt: mode === 'off' ? null : (expiresAt ?? null) };
};

/** What the admin list sees: hidden/deleted facts always; the countdown only while the rule is active. */
export const presentForAdmin = <T extends Record<string, unknown>>(row: T, mode: RetentionMode = getRetentionMode()) => {
  const expiresAt = (row as { expiresAt?: unknown }).expiresAt ?? null;
  return { ...row, expiresAt: mode === 'off' ? null : expiresAt };
};
