import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { cleanupOrphanFiles, extractStorageKey, getAttachmentUrl, getSecureDownloadUrl } from './upload.service';

// Limits of the story-style highlights (see prisma Highlight / HighlightItem).
export const MAX_HIGHLIGHTS = 20;
export const MAX_ITEMS = 30;
/** Staged (not yet saved) editor uploads one staff member may hold at a time. */
export const MAX_STAGED_UPLOADS = 60;
export const STAGED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
export const TITLE_MAX = 30;

export const LEGACY_PREFIX = 'legacy-';

/** The older one-image form kept in User.igHighlights. */
export interface LegacyHighlight {
  title: string;
  imageUrl: string;
}

export interface HighlightSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  itemCount: number;
  /** Still the old JSON form (no rows yet); read-only for viewers. */
  legacy?: boolean;
}

export interface HighlightItemView {
  id: string;
  url: string | null;
  /** Saves the file instead of opening it: the original when kept, else the image as shown. */
  downloadUrl: string | null;
}

export interface HighlightDetail {
  id: string;
  title: string;
  coverItemId: string | null;
  /** Version for the editor's conflict check (staff only; absent for the legacy copy). */
  updatedAt?: string;
  items: HighlightItemView[];
}

/** Parses User.igHighlights defensively: it is untyped JSON written by several older code paths. */
export const parseLegacy = (value: unknown): LegacyHighlight[] => {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  const result: LegacyHighlight[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const { title, imageUrl } = entry as { title?: unknown; imageUrl?: unknown };
    if (typeof imageUrl !== 'string') continue;
    const key = extractStorageKey(imageUrl.trim());
    if (!key) continue;
    const name = typeof title === 'string' ? title.trim().slice(0, TITLE_MAX) : '';
    result.push({ title: name || 'Highlight', imageUrl: key });
    if (result.length >= MAX_HIGHLIGHTS) break;
  }
  return result;
};

/** True when `ids` lists every id of `existing` exactly once (a pure reordering). */
export const isPermutation = (ids: string[], existing: string[]): boolean => {
  if (ids.length !== existing.length) return false;
  const wanted = new Set(existing);
  const seen = new Set<string>();
  for (const id of ids) {
    if (!wanted.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
};

/** A display link for a storage key, or null when it cannot be signed (the viewer then skips it). */
export const signKey = async (key: string | null | undefined): Promise<string | null> => {
  if (!key) return null;
  try {
    return (await getSecureDownloadUrl(key)) || null;
  } catch (err) {
    console.warn('[Highlights] could not sign a link:', err instanceof Error ? err.message : err);
    return null;
  }
};

interface RowWithItems {
  id: string;
  title: string;
  coverItemId: string | null;
  updatedAt?: Date;
  items: { id: string; imageUrl: string; originalUrl?: string | null }[];
}

const coverKeyOf = (row: RowWithItems): string | null => {
  const cover = row.items.find((item) => item.id === row.coverItemId) ?? row.items[0];
  return cover ? cover.imageUrl : null;
};

const itemsInOrder = { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true, originalUrl: true } };

const toSummary = async (row: RowWithItems): Promise<HighlightSummary> => ({
  id: row.id,
  title: row.title,
  coverUrl: await signKey(coverKeyOf(row)),
  itemCount: row.items.length,
});

/**
 * Copies a client's old User.igHighlights into the new tables, once. Safe to call
 * any number of times and concurrently (the user row is locked): it does nothing
 * when the client already has highlight rows. The JSON is emptied afterwards, so a
 * client who later deletes every highlight is not shown the old ones again; nothing
 * is lost, the same titles and images now live in the tables.
 */
export const materializeLegacy = async (userId: string): Promise<boolean> => {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ igHighlights: unknown }[]>`
      SELECT "igHighlights" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (rows.length === 0) return false;
    if ((await tx.highlight.count({ where: { userId } })) > 0) return false;

    const legacy = parseLegacy(rows[0].igHighlights);
    if (legacy.length === 0) return false;

    for (const [index, entry] of legacy.entries()) {
      await tx.highlight.create({
        data: {
          userId,
          title: entry.title,
          sortOrder: index,
          items: { create: [{ imageUrl: entry.imageUrl, sortOrder: 0 }] },
        },
      });
    }
    await tx.user.update({ where: { id: userId }, data: { igHighlights: [] } });
    return true;
  });
};

/** Staff view: real rows only (the legacy copy is made first). */
export const listForStaff = async (clientId: string): Promise<HighlightSummary[]> => {
  await materializeLegacy(clientId);
  const rows = await prisma.highlight.findMany({
    where: { userId: clientId },
    orderBy: { sortOrder: 'asc' },
    include: { items: itemsInOrder },
  });
  return Promise.all(rows.map(toSummary));
};

/** Viewer list (client portal, share link): rows, or the old JSON as one-image highlights while there are none. */
export const listForViewer = async (userId: string): Promise<HighlightSummary[]> => {
  const rows = await prisma.highlight.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
    include: { items: itemsInOrder },
  });
  if (rows.length > 0) return Promise.all(rows.map(toSummary));

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { igHighlights: true } });
  const legacy = parseLegacy(user?.igHighlights);
  return Promise.all(
    legacy.map(async (entry, index) => ({
      id: `${LEGACY_PREFIX}${index}`,
      title: entry.title,
      coverUrl: await signKey(entry.imageUrl),
      itemCount: 1,
      legacy: true,
    })),
  );
};

export const detailOf = async (row: RowWithItems): Promise<HighlightDetail> => ({
  id: row.id,
  title: row.title,
  coverItemId: row.coverItemId,
  ...(row.updatedAt && { updatedAt: row.updatedAt.toISOString() }),
  items: await Promise.all(
    row.items.map(async (item) => ({
      id: item.id,
      url: await signKey(item.imageUrl),
      downloadUrl: await getAttachmentUrl(item.originalUrl || item.imageUrl),
    })),
  ),
});

/** One highlight with its images for a viewer; `null` when it is not this user's. */
export const getForViewer = async (userId: string, id: string): Promise<HighlightDetail | null> => {
  if (id.startsWith(LEGACY_PREFIX)) {
    const index = Number(id.slice(LEGACY_PREFIX.length));
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { igHighlights: true } });
    const entry = Number.isInteger(index) ? parseLegacy(user?.igHighlights)[index] : undefined;
    if (!entry) return null;
    return {
      id,
      title: entry.title,
      coverItemId: null,
      items: [{ id: `${id}-0`, url: await signKey(entry.imageUrl), downloadUrl: await getAttachmentUrl(entry.imageUrl) }],
    };
  }
  const row = await prisma.highlight.findFirst({
    where: { id, userId },
    include: { items: itemsInOrder },
  });
  return row ? detailOf(row) : null;
};

/** Every storage key a client's highlights point at (rows, and the old JSON of a client never migrated). */
export const collectUserHighlightKeys = async (userId: string, legacyJson?: unknown): Promise<string[]> => {
  const items = await prisma.highlightItem.findMany({
    where: { highlight: { userId } },
    select: { imageUrl: true, originalUrl: true },
  });
  const keys = [
    ...items.flatMap((item) => [item.imageUrl, item.originalUrl ?? '']),
    ...parseLegacy(legacyJson).map((entry) => entry.imageUrl),
  ];
  return [...new Set(keys.filter(Boolean))];
};

/**
 * Deletes highlight images from storage. Call only AFTER the database no longer
 * points at them; a key another row still uses is kept. Never throws: the worst a
 * failure leaves behind is an orphaned file.
 */
export const deleteHighlightFiles = async (keys: string[]): Promise<void> => {
  const unique = [...new Set(keys.map((key) => extractStorageKey(key)).filter(Boolean))];
  if (unique.length === 0) return;
  try {
    const stillUsed = await prisma.highlightItem.findMany({
      where: { OR: [{ imageUrl: { in: unique } }, { originalUrl: { in: unique } }] },
      select: { imageUrl: true, originalUrl: true },
    });
    const keep = new Set(stillUsed.flatMap((item) => [item.imageUrl, item.originalUrl ?? '']));
    await cleanupOrphanFiles(
      unique.filter((key) => !keep.has(key)),
      [],
    );
  } catch (err) {
    console.warn('[Highlights] file cleanup failed:', err instanceof Error ? err.message : err);
  }
};

// ---------------------------------------------------------------------------
// One-step save (the editor's "Yadda saxla") and the staging area behind it.
// ---------------------------------------------------------------------------

const TX_OPTIONS = { timeout: 20_000 };

export type ItemRef = { id: string } | { uploadKey: string };

export interface SaveInput {
  title: string;
  items: ItemRef[];
  /** Position in `items` of the circle image; null/undefined = the first one. */
  coverIndex?: number | null;
}

/** A save that is refused for a reason the editor can show (status is the HTTP code). */
export class SaveError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The staged uploads this staff member may use; throws when a key is unknown, someone else's, or listed twice. */
const claimStaged = async (
  tx: Prisma.TransactionClient,
  staffId: string,
  keys: string[],
): Promise<Map<string, string | null>> => {
  if (keys.length === 0) return new Map();
  if (new Set(keys).size !== keys.length) throw new SaveError(400, 'Eyni şəkil iki dəfə göndərilib.');
  const rows = await tx.highlightUpload.findMany({
    where: { key: { in: keys }, uploadedById: staffId },
    select: { key: true, originalKey: true },
  });
  if (rows.length !== keys.length) {
    throw new SaveError(400, 'Yüklənmiş şəkillərdən biri tapılmadı. Şəkli yenidən əlavə edin.');
  }
  // staged key -> its original (null when no separate copy was made)
  return new Map(rows.map((row) => [row.key, row.originalKey]));
};

const checkCover = (input: SaveInput): void => {
  if (input.coverIndex != null && input.coverIndex >= input.items.length) {
    throw new SaveError(400, 'Kover üçün highlight-ın şəkli seçilməlidir.');
  }
};

/**
 * Creates a highlight with its images in one transaction. Every item must be a staged
 * upload of `staffId`; staging rows are consumed. Returns the new highlight.
 */
export const createHighlightWithItems = async (clientId: string, staffId: string, input: SaveInput) => {
  checkCover(input);
  const keys: string[] = [];
  for (const item of input.items) {
    if (!('uploadKey' in item)) throw new SaveError(400, 'Yeni highlight-a yalnız yeni şəkillər əlavə olunur.');
    keys.push(item.uploadKey);
  }
  await materializeLegacy(clientId);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${clientId} FOR UPDATE`;
    if ((await tx.highlight.count({ where: { userId: clientId } })) >= MAX_HIGHLIGHTS) {
      throw new SaveError(400, `Bir müştəridə ən çox ${MAX_HIGHLIGHTS} highlight ola bilər.`);
    }
    const originals = await claimStaged(tx, staffId, keys);
    const last = await tx.highlight.aggregate({ where: { userId: clientId }, _max: { sortOrder: true } });
    const row = await tx.highlight.create({
      data: { userId: clientId, title: input.title, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    const ids: string[] = [];
    for (const [index, key] of keys.entries()) {
      const item = await tx.highlightItem.create({
        data: { highlightId: row.id, imageUrl: key, originalUrl: originals.get(key) ?? null, sortOrder: index },
        select: { id: true },
      });
      ids.push(item.id);
    }
    const coverItemId = input.coverIndex != null ? ids[input.coverIndex] : null;
    await tx.highlight.update({ where: { id: row.id }, data: { coverItemId } });
    await tx.highlightUpload.deleteMany({ where: { key: { in: keys } } });
    return tx.highlight.findUniqueOrThrow({ where: { id: row.id }, include: { items: itemsInOrder } });
  }, TX_OPTIONS);
};

/**
 * Replaces a highlight's title, images, order and cover in one transaction. `expectedUpdatedAt`
 * must still be the stored version, otherwise someone else saved first (409). Images that are no
 * longer listed are deleted from the database here and from storage by the caller afterwards.
 */
export const saveHighlightWithItems = async (
  id: string,
  staffId: string,
  input: SaveInput,
  expectedUpdatedAt: string,
): Promise<{ row: Awaited<ReturnType<typeof createHighlightWithItems>>; removedKeys: string[] } | null> => {
  checkCover(input);
  const expected = new Date(expectedUpdatedAt).getTime();

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Highlight" WHERE "id" = ${id} FOR UPDATE`;
    if (locked.length === 0) return null;
    const current = await tx.highlight.findUniqueOrThrow({ where: { id }, include: { items: itemsInOrder } });
    if (!Number.isFinite(expected) || current.updatedAt.getTime() !== expected) {
      throw new SaveError(409, 'Bu highlight başqa yerdə dəyişdirilib. Səhifəni yeniləyin.');
    }

    const existing = new Map(current.items.map((item) => [item.id, item]));
    const keptIds = new Set<string>();
    const newKeys: string[] = [];
    for (const item of input.items) {
      if ('id' in item) {
        if (!existing.has(item.id) || keptIds.has(item.id)) {
          throw new SaveError(400, 'Şəkillər düzgün göndərilməyib. Səhifəni yeniləyin.');
        }
        keptIds.add(item.id);
      } else {
        newKeys.push(item.uploadKey);
      }
    }
    const originals = await claimStaged(tx, staffId, newKeys);

    const removed = current.items.filter((item) => !keptIds.has(item.id));
    if (removed.length > 0) {
      await tx.highlightItem.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } });
    }
    const orderedIds: string[] = [];
    for (const [index, item] of input.items.entries()) {
      if ('id' in item) {
        await tx.highlightItem.update({ where: { id: item.id }, data: { sortOrder: index } });
        orderedIds.push(item.id);
      } else {
        const created = await tx.highlightItem.create({
          data: { highlightId: id, imageUrl: item.uploadKey, originalUrl: originals.get(item.uploadKey) ?? null, sortOrder: index },
          select: { id: true },
        });
        orderedIds.push(created.id);
      }
    }
    await tx.highlight.update({
      where: { id },
      data: {
        title: input.title,
        coverItemId: input.coverIndex != null ? orderedIds[input.coverIndex] : null,
      },
    });
    if (newKeys.length > 0) await tx.highlightUpload.deleteMany({ where: { key: { in: newKeys } } });

    const row = await tx.highlight.findUniqueOrThrow({ where: { id }, include: { items: itemsInOrder } });
    return { row, removedKeys: removed.flatMap((item) => [item.imageUrl, item.originalUrl ?? '']) };
  }, TX_OPTIONS);
};

/** Deletes staged uploads older than the TTL (rows first, then files). Returns how many were removed. */
export const cleanupStaleUploads = async (now: number = Date.now()): Promise<number> => {
  const cutoff = new Date(now - STAGED_UPLOAD_TTL_MS);
  let total = 0;
  for (;;) {
    const stale = await prisma.highlightUpload.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, key: true, originalKey: true },
      take: 200,
    });
    if (stale.length === 0) return total;
    await prisma.highlightUpload.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
    await deleteHighlightFiles(stale.flatMap((row) => [row.key, row.originalKey ?? '']));
    total += stale.length;
  }
};
