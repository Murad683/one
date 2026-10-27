import prisma from '../utils/prisma';
import { collectDeliverableKeys, deleteUnreferencedDeliverableKeys } from './upload.service';
import {
  computeExpiresAt,
  hasRetainedMedia,
  purgeCutoff,
  MAX_PURGES_PER_RUN,
  PURGE_ANOMALY_LIMIT,
} from '../utils/retention';

const log = (message: string) => console.log(`[Retention] ${message}`);

/**
 * Starts the retention clock the first time a video deliverable is READY.
 * Safe to call after every status change: the conditional update only writes
 * when the clock has not started yet, so a replaced video keeps its deadline.
 * Never throws — a missed stamp is picked up by the next job run.
 */
export async function stampFirstReady(id: string, now: Date = new Date()): Promise<void> {
  try {
    const row = await prisma.deliverable.findUnique({
      where: { id },
      select: { status: true, files: true, firstReadyAt: true, mediaDeletedAt: true },
    });
    if (!row || row.status !== 'READY' || row.firstReadyAt || row.mediaDeletedAt) return;
    if (!hasRetainedMedia(row.files)) return;
    await prisma.deliverable.updateMany({
      where: { id, status: 'READY', firstReadyAt: null, mediaDeletedAt: null },
      data: { firstReadyAt: now, expiresAt: computeExpiresAt(now) },
    });
  } catch (err) {
    console.error(`[Retention] stampFirstReady failed for ${id}:`, err);
  }
}

export interface RetentionRunOptions {
  /** Start clocks for READY videos that have none (old rows, missed stamps). */
  stamp: boolean;
  /** Actually hide and delete. False = only report what would happen. */
  act: boolean;
  now?: Date;
}

export interface RetentionRunResult {
  stamped: number;
  hidden: number;
  purged: number;
  /** Ids that would be hidden / purged (filled in report-only runs too). */
  dueToHide: string[];
  dueToPurge: string[];
  skipped: string[];
  aborted: boolean;
}

/**
 * One pass of the retention rule. Every write is conditional on the state it
 * read, so a concurrent run (the CLI next to the API's own timer) or an admin
 * edit in between can never cause a double delete; the loser just skips.
 * Order inside a purge: database first, then storage — a failure leaves at
 * worst an orphaned file, never a live row pointing at a deleted one.
 */
export async function runRetention(options: RetentionRunOptions): Promise<RetentionRunResult> {
  const now = options.now ?? new Date();
  const result: RetentionRunResult = {
    stamped: 0, hidden: 0, purged: 0, dueToHide: [], dueToPurge: [], skipped: [], aborted: false,
  };

  // (0) READY videos without a clock: their 60 days start now.
  if (options.stamp) {
    const unstamped = await prisma.deliverable.findMany({
      where: { status: 'READY', firstReadyAt: null, mediaDeletedAt: null },
      select: { id: true, files: true },
    });
    for (const row of unstamped) {
      if (!hasRetainedMedia(row.files)) continue;
      const { count } = await prisma.deliverable.updateMany({
        where: { id: row.id, status: 'READY', firstReadyAt: null, mediaDeletedAt: null },
        data: { firstReadyAt: now, expiresAt: computeExpiresAt(now) },
      });
      result.stamped += count;
    }
    if (result.stamped > 0) log(`started the clock for ${result.stamped} video(s)`);
  }

  // (a) Deadline passed: hide from the client.
  const expired = await prisma.deliverable.findMany({
    where: { expiresAt: { lte: now }, hiddenAt: null, mediaDeletedAt: null },
    select: { id: true, files: true },
  });
  for (const row of expired) {
    if (!hasRetainedMedia(row.files)) {
      result.skipped.push(row.id);
      continue;
    }
    result.dueToHide.push(row.id);
    if (!options.act) continue;
    const { count } = await prisma.deliverable.updateMany({
      where: { id: row.id, expiresAt: { lte: now }, hiddenAt: null, mediaDeletedAt: null },
      data: { hiddenAt: now },
    });
    result.hidden += count;
  }
  if (result.dueToHide.length > 0) {
    log(`${options.act ? 'hid' : 'would hide'} ${options.act ? result.hidden : result.dueToHide.length}: ${result.dueToHide.join(', ')}`);
  }

  // (b) Hidden for the whole buffer: delete the files, keep the row.
  const cutoff = purgeCutoff(now);
  const purgeWhere = { hiddenAt: { lte: cutoff }, mediaDeletedAt: null };
  const waiting = await prisma.deliverable.count({ where: purgeWhere });
  if (waiting > PURGE_ANOMALY_LIMIT) {
    // Far more than the rule should ever produce in an hour: something is wrong
    // (clock, bad data, a bulk edit). Delete nothing and leave it to a human.
    console.warn(`[Retention] ${waiting} deliverables due for deletion (limit ${PURGE_ANOMALY_LIMIT}) — nothing deleted, check before running again`);
    result.aborted = true;
    return result;
  }

  const due = await prisma.deliverable.findMany({
    where: purgeWhere,
    orderBy: { hiddenAt: 'asc' },
    take: MAX_PURGES_PER_RUN,
    select: { id: true, files: true, thumbnailUrl: true, originalUrl: true, updatedAt: true },
  });
  for (const row of due) {
    if (!hasRetainedMedia(row.files)) {
      result.skipped.push(row.id);
      continue;
    }
    result.dueToPurge.push(row.id);
    if (!options.act) continue;

    const keys = collectDeliverableKeys(row);
    const { count } = await prisma.deliverable.updateMany({
      // updatedAt: the row must be exactly as read, otherwise skip until the next run.
      where: { id: row.id, hiddenAt: { lte: cutoff }, mediaDeletedAt: null, updatedAt: row.updatedAt },
      data: { files: [], thumbnailUrl: null, originalUrl: null, mediaDeletedAt: now },
    });
    if (count === 0) {
      result.skipped.push(row.id);
      continue;
    }
    result.purged += 1;
    await deleteUnreferencedDeliverableKeys(keys);
    log(`deleted the files of ${row.id} (${keys.length} key(s))`);
  }
  if (!options.act && result.dueToPurge.length > 0) {
    log(`would delete the files of ${result.dueToPurge.length}: ${result.dueToPurge.join(', ')}`);
  }
  if (result.skipped.length > 0) log(`skipped (no video or changed meanwhile): ${result.skipped.join(', ')}`);

  return result;
}
