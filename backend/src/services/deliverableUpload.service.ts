import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { ABORTED_REASON, isProblem, uploadViewOf, type UploadView } from '../utils/deliverableUploads';

/**
 * Database side of upload tracking. Tracking must never break an upload: every write here
 * swallows its own error (and logs it), the upload itself goes on.
 */

export interface TrackStart {
  deliverableId: string;
  createdById: string | null;
  kind: 'MULTIPART' | 'SINGLE';
  storageKey: string;
  uploadId?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const trackUploadStart = async (input: TrackStart): Promise<void> => {
  try {
    await prisma.deliverableUpload.create({
      data: {
        deliverableId: input.deliverableId,
        createdById: input.createdById,
        kind: input.kind,
        storageKey: input.storageKey,
        uploadId: input.uploadId ?? null,
        fileName: String(input.fileName ?? '').slice(0, 255),
        fileSize: BigInt(Math.max(0, Math.floor(Number(input.fileSize) || 0))),
        mimeType: String(input.mimeType ?? '').slice(0, 120),
      },
    });
  } catch (err) {
    console.error('[Uploads] could not record upload start:', err);
  }
};

/** Progress ping from the browser. `done` = the whole object is in storage (a single PUT finished). */
export const touchUpload = async (
  deliverableId: string,
  storageKey: string,
  progress: number,
  done = false,
): Promise<boolean> => {
  try {
    const pct = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)));
    const result = await prisma.deliverableUpload.updateMany({
      // Only a live upload can be pinged; ended ones stay as they are.
      where: { deliverableId, storageKey, status: { in: ['UPLOADING', 'ASSEMBLED'] } },
      data: { progress: pct, lastActivityAt: new Date(), ...(done ? { status: 'ASSEMBLED' } : {}) },
    });
    return result.count > 0;
  } catch (err) {
    console.error('[Uploads] could not record progress:', err);
    return false;
  }
};

export const markUploadsByKey = async (
  storageKeys: string[],
  status: 'ASSEMBLED' | 'FINALIZED' | 'ABORTED' | 'EXPIRED',
  reason?: string | null,
): Promise<void> => {
  const keys = storageKeys.filter((key) => typeof key === 'string' && key);
  if (keys.length === 0) return;
  try {
    await prisma.deliverableUpload.updateMany({
      // Only live uploads move on: an ended upload is never revived, FINALIZED is never overwritten.
      where: { storageKey: { in: keys }, status: { in: ['UPLOADING', 'ASSEMBLED'] } },
      data: {
        status,
        lastActivityAt: new Date(),
        ...(status === 'ASSEMBLED' ? {} : { endedAt: new Date() }),
        ...(reason !== undefined ? { reason } : {}),
      },
    });
  } catch (err) {
    console.error('[Uploads] could not update upload status:', err);
  }
};

export const markAborted = (keys: string[], reason: string = ABORTED_REASON) => markUploadsByKey(keys, 'ABORTED', reason);

type UploadRow = Prisma.DeliverableUploadGetPayload<object>;

/** Newest upload row of each given deliverable (older rows are ignored). */
const latestPerDeliverable = async (deliverableIds: string[]): Promise<Map<string, UploadRow>> => {
  const latest = new Map<string, UploadRow>();
  if (deliverableIds.length === 0) return latest;
  const rows = await prisma.deliverableUpload.findMany({
    where: { deliverableId: { in: deliverableIds } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  for (const row of rows) if (!latest.has(row.deliverableId)) latest.set(row.deliverableId, row);
  return latest;
};

const hasFilesOf = (files: unknown): boolean => Array.isArray(files) && files.length > 0;

/** Upload view per deliverable id, for the rows of one list page. */
export const uploadViewsFor = async (
  rows: Array<{ id: string; files: unknown }>,
  now: number = Date.now(),
): Promise<Map<string, UploadView>> => {
  const latest = await latestPerDeliverable(rows.map((row) => row.id));
  const views = new Map<string, UploadView>();
  for (const row of rows) {
    const view = uploadViewOf(latest.get(row.id), hasFilesOf(row.files), now);
    if (view) views.set(row.id, view);
  }
  return views;
};

/**
 * Ids of the deliverables whose upload needs attention (cut off, not finalized, given up on).
 * `creatorId` limits it to one creator's own rows, the same scope the list already applies.
 */
export const problemDeliverableIds = async (creatorId?: string, now: number = Date.now()): Promise<string[]> => {
  const candidates = await prisma.deliverableUpload.findMany({
    where: {
      status: { not: 'FINALIZED' },
      ...(creatorId ? { deliverable: { createdById: creatorId } } : {}),
    },
    select: { deliverableId: true, deliverable: { select: { files: true } } },
    distinct: ['deliverableId'],
  });
  if (candidates.length === 0) return [];
  const filesOf = new Map(candidates.map((c) => [c.deliverableId, hasFilesOf(c.deliverable.files)]));
  const latest = await latestPerDeliverable([...filesOf.keys()]);
  const ids: string[] = [];
  for (const [id, row] of latest) {
    if (isProblem(uploadViewOf(row, filesOf.get(id) ?? false, now))) ids.push(id);
  }
  return ids;
};
