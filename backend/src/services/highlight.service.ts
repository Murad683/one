import prisma from '../utils/prisma';
import { cleanupOrphanFiles, extractStorageKey, getSecureDownloadUrl } from './upload.service';

// Limits of the story-style highlights (see prisma Highlight / HighlightItem).
export const MAX_HIGHLIGHTS = 20;
export const MAX_ITEMS = 30;
export const MAX_FILES_PER_REQUEST = 10;
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
}

export interface HighlightDetail {
  id: string;
  title: string;
  coverItemId: string | null;
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
  items: { id: string; imageUrl: string }[];
}

const coverKeyOf = (row: RowWithItems): string | null => {
  const cover = row.items.find((item) => item.id === row.coverItemId) ?? row.items[0];
  return cover ? cover.imageUrl : null;
};

const itemsInOrder = { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true } };

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
  items: await Promise.all(row.items.map(async (item) => ({ id: item.id, url: await signKey(item.imageUrl) }))),
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
      items: [{ id: `${id}-0`, url: await signKey(entry.imageUrl) }],
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
    select: { imageUrl: true },
  });
  const keys = [...items.map((item) => item.imageUrl), ...parseLegacy(legacyJson).map((entry) => entry.imageUrl)];
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
      where: { imageUrl: { in: unique } },
      select: { imageUrl: true },
    });
    const keep = new Set(stillUsed.map((item) => item.imageUrl));
    await cleanupOrphanFiles(
      unique.filter((key) => !keep.has(key)),
      [],
    );
  } catch (err) {
    console.warn('[Highlights] file cleanup failed:', err instanceof Error ? err.message : err);
  }
};
