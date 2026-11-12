import prisma from '../utils/prisma';
import { abortMultipartUpload, getBlobProperties, listIncompleteMultipartUploads } from '../services/upload.service';
import {
  EXPIRED_REASON,
  EXPIRE_ANOMALY_LIMIT,
  MAX_EXPIRES_PER_RUN,
  UNTRACKED_REPORT_AFTER_MS,
  UPLOAD_EXPIRE_AFTER_MS,
  getUploadCleanupMode,
  type UploadCleanupMode,
} from '../utils/deliverableUploads';

const HOUR_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 4 * 60 * 1000;

export interface UploadCleanupResult {
  expired: number;
  keptForResume: number;
  untracked: number;
  aborted: boolean;
}

const isGone = (err: unknown): boolean => {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchUpload' || e?.Code === 'NoSuchUpload' || e?.$metadata?.httpStatusCode === 404;
};

/**
 * Hourly. UPLOAD_CLEANUP_MODE: off (nothing) | dry-run (only logs what it would do) | on.
 *
 * - A multipart upload with no sign of life for 6 hours is cancelled (its half-uploaded parts
 *   would otherwise sit in storage for ever) and the row says so, which the admin list shows.
 * - A single upload whose file did reach storage is kept: the row becomes ASSEMBLED, so the
 *   admin can start processing ("Emalı başlat"). A finished file is never deleted here.
 * - Multipart uploads in storage that no row knows about (from before tracking existed) are
 *   only reported in the log, never touched.
 */
export const runUploadCleanup = async (
  mode: UploadCleanupMode = getUploadCleanupMode(),
  now: number = Date.now(),
): Promise<UploadCleanupResult> => {
  const result: UploadCleanupResult = { expired: 0, keptForResume: 0, untracked: 0, aborted: false };
  if (mode === 'off') return result;
  const act = mode === 'on';

  const stale = await prisma.deliverableUpload.findMany({
    where: { status: 'UPLOADING', lastActivityAt: { lt: new Date(now - UPLOAD_EXPIRE_AFTER_MS) } },
    orderBy: { lastActivityAt: 'asc' },
    take: EXPIRE_ANOMALY_LIMIT + 1,
  });

  if (stale.length > EXPIRE_ANOMALY_LIMIT) {
    console.warn(`[Uploads] ${stale.length}+ uploads look abandoned at once: unexpected, cancelling none.`);
    result.aborted = true;
  } else {
    for (const upload of stale.slice(0, MAX_EXPIRES_PER_RUN)) {
      const label = `${upload.fileName} (${upload.kind}, deliverable ${upload.deliverableId}, last activity ${upload.lastActivityAt.toISOString()})`;
      try {
        if (upload.kind === 'SINGLE') {
          const props = await getBlobProperties(upload.storageKey);
          if (props.exists) {
            console.log(`[Uploads] ${act ? 'keeping for resume' : 'would keep for resume'}: ${label}`);
            if (act) {
              await prisma.deliverableUpload.update({
                where: { id: upload.id },
                data: { status: 'ASSEMBLED', progress: 100 },
              });
            }
            result.keptForResume += 1;
            continue;
          }
        }
        console.log(`[Uploads] ${act ? 'cancelling' : 'would cancel'}: ${label}`);
        if (act) {
          // Storage first: if the row update then fails the upload is retried next hour
          // (cancelling an already cancelled upload counts as done).
          if (upload.kind === 'MULTIPART' && upload.uploadId) {
            await abortMultipartUpload(upload.storageKey, upload.uploadId).catch((err) => {
              if (!isGone(err)) throw err;
            });
          }
          await prisma.deliverableUpload.update({
            where: { id: upload.id },
            data: { status: 'EXPIRED', endedAt: new Date(), reason: EXPIRED_REASON },
          });
        }
        result.expired += 1;
      } catch (err) {
        console.error(`[Uploads] could not process ${label}:`, err);
      }
    }
  }

  // Report only: multipart uploads in storage that no row knows about.
  try {
    const known = new Set(
      (await prisma.deliverableUpload.findMany({ where: { uploadId: { not: null } }, select: { uploadId: true } })).map(
        (row) => row.uploadId as string,
      ),
    );
    const cutoff = now - UNTRACKED_REPORT_AFTER_MS;
    for (const prefix of ['videos/', 'designs/']) {
      for (const upload of await listIncompleteMultipartUploads(prefix)) {
        if (known.has(upload.uploadId) || upload.initiated.getTime() > cutoff) continue;
        console.log(`[Uploads] untracked incomplete upload (not touched): ${upload.storageKey}, started ${upload.initiated.toISOString()}`);
        result.untracked += 1;
      }
    }
  } catch (err) {
    console.error('[Uploads] could not list incomplete uploads:', err);
  }

  return result;
};

let running = false;

const tick = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    const mode = getUploadCleanupMode();
    if (mode === 'off') return;
    const result = await runUploadCleanup(mode);
    if (result.expired || result.keptForResume || result.untracked) {
      console.log(`[Uploads] cleanup (${mode}): ${JSON.stringify(result)}`);
    }
  } catch (err) {
    console.error('[Uploads] cleanup failed:', err);
  } finally {
    running = false;
  }
};

export const startUploadCleanup = (): void => {
  console.log(`[Uploads] cleanup mode: ${getUploadCleanupMode()}`);
  setTimeout(() => void tick(), FIRST_RUN_DELAY_MS).unref();
  setInterval(() => void tick(), HOUR_MS).unref();
};
