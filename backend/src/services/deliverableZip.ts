import path from 'path';
import type { Response } from 'express';
import archiver from 'archiver';
import { canStreamObjects, extractStorageKey, getBlobProperties, getObjectStreamForKey } from './upload.service';

// Limits of one "download all" ZIP. Images are light, this only stops a huge
// video carousel from tying up the API (shared with other sites on the server).
export const MAX_ZIP_FILES = 30;
export const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const MAX_CONCURRENT_ZIPS = 2;
// Asking the storage for every file's size is slow and erratic (single calls took 10 ms to 6 s), so it is
// done only where a ZIP can really get big: a post with a video or with many files.
const SIZE_CHECK_MIN_FILES = 12;

let activeZips = 0;
export const acquireZipSlot = (): boolean => {
  if (activeZips >= MAX_CONCURRENT_ZIPS) return false;
  activeZips += 1;
  return true;
};
export const releaseZipSlot = (): void => {
  activeZips = Math.max(0, activeZips - 1);
};

export class ZipError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ZipError';
  }
}

export interface ZipEntry {
  key: string;
  name: string;
}

interface ZipSource {
  title: string;
  files?: unknown;
  originalUrl?: string | null;
}

/** File name safe for a ZIP entry and a download header: letters (incl. Azerbaijani), digits, space, dash. */
const safeBase = (title: string): string => {
  const cleaned = title.replace(/[^\p{L}\p{N} _-]+/gu, '-').replace(/\s+/g, ' ').trim().slice(0, 60);
  return cleaned || 'fayllar';
};

const AZ_TO_ASCII: Record<string, string> = {
  ə: 'e', Ə: 'E', ş: 's', Ş: 'S', ç: 'c', Ç: 'C', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
};

/** Plain ASCII twin of the name for the legacy `filename=` header (the real name travels in `filename*`). */
const asciiFallback = (name: string): string =>
  name
    .replace(/[əƏşŞçÇöÖüÜğĞıİ]/g, (c) => AZ_TO_ASCII[c] ?? c)
    .normalize('NFD')
    .replace(/[^\x20-\x7e]+/g, '')
    .trim();

/**
 * The files to pack, each in its best available form: its own original (images
 * uploaded after per-file originals were recorded), else the first file's
 * row-level original, else the file as shown in the portal.
 */
export const planZip = (row: ZipSource): { base: string; entries: ZipEntry[]; needsSizeCheck: boolean } => {
  const files = Array.isArray(row.files)
    ? (row.files as Array<{ url?: unknown; originalUrl?: unknown; name?: unknown; type?: unknown }>)
    : [];
  const base = safeBase(row.title);
  const entries: ZipEntry[] = [];
  files.forEach((f, index) => {
    const candidates = [f?.originalUrl, index === 0 ? row.originalUrl : null, f?.url];
    const key = candidates.find((k): k is string => typeof k === 'string' && k.length > 0);
    if (!key) return;
    const ext = path.extname(extractStorageKey(key) || '') || path.extname(String(f?.name ?? ''));
    entries.push({ key, name: `${base}-${entries.length + 1}${ext}` });
  });
  const hasVideo = files.some((f) => typeof f?.type === 'string' && f.type.toLowerCase().startsWith('video/'));
  return { base, entries, needsSizeCheck: hasVideo || entries.length > SIZE_CHECK_MIN_FILES };
};

/**
 * A highlight's images in the order the client sees them, each as its original when kept.
 * The cover (chosen, else the first image) is marked in its file name: "Atmosfer-2-kover.jpg".
 */
export const planHighlightZip = (row: {
  title: string;
  coverItemId: string | null;
  items: { id: string; imageUrl: string; originalUrl: string | null }[];
}): { base: string; entries: ZipEntry[]; needsSizeCheck: boolean } => {
  const base = safeBase(row.title);
  const coverId = row.items.some((item) => item.id === row.coverItemId) ? row.coverItemId : row.items[0]?.id;
  const entries = row.items.map((item, index) => {
    const key = item.originalUrl || item.imageUrl;
    const ext = path.extname(extractStorageKey(key) || '');
    return { key, name: `${base}-${index + 1}${item.id === coverId ? '-kover' : ''}${ext}` };
  });
  return { base, entries, needsSizeCheck: entries.length > SIZE_CHECK_MIN_FILES };
};

/**
 * Throws a ZipError the caller can show as is, before any byte of the ZIP is sent.
 * The size check (one storage call per file, run in parallel) only runs when `checkSizes` is true;
 * streamZip also stops a ZIP that grows past the limit.
 */
export const assertZipAllowed = async (entries: ZipEntry[], checkSizes: boolean): Promise<void> => {
  if (!canStreamObjects()) throw new ZipError('ZIP yükləmə hazırda mövcud deyil.', 501);
  if (entries.length < 2) throw new ZipError('ZIP yalnız bir neçə fayl olanda lazımdır.', 400);
  if (entries.length > MAX_ZIP_FILES) {
    throw new ZipError(`Bir ZIP-də ən çox ${MAX_ZIP_FILES} fayl ola bilər. Faylları ayrı-ayrılıqda yükləyin.`, 413);
  }
  if (!checkSizes) return;
  const sizes = await Promise.all(entries.map((entry) => getBlobProperties(entry.key)));
  let total = 0;
  for (const props of sizes) {
    if (!props.exists) throw new ZipError('Fayllardan biri tapılmadı.', 404);
    total += props.contentLength ?? 0;
  }
  if (total > MAX_ZIP_BYTES) {
    throw new ZipError('Fayllar ZIP üçün çox böyükdür. Faylları ayrı-ayrılıqda yükləyin.', 413);
  }
};

/** Streams the ZIP into the response, opening one object at a time. Caller holds a zip slot. */
export const streamZip = async (res: Response, base: string, entries: ZipEntry[]): Promise<void> => {
  const archive = archiver('zip', { store: true }); // images are already compressed
  const asciiName = `${asciiFallback(base) || 'fayllar'}.zip`;
  res.status(200);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(`${base}.zip`)}`);
  archive.pipe(res);

  let aborted = false;
  res.on('close', () => {
    if (!res.writableFinished) {
      aborted = true;
      archive.abort();
    }
  });
  archive.on('warning', (err) => console.warn('[Zip] warning:', err.message));
  // One permanent error listener (a per-entry listener would pile up); it fails whichever entry is being packed.
  let failCurrent: ((err: unknown) => void) | null = null;
  archive.on('error', (err) => failCurrent?.(err));

  let bytes = 0;
  try {
    for (const entry of entries) {
      if (aborted) return;
      const { body } = await getObjectStreamForKey(entry.key);
      await new Promise<void>((resolve, reject) => {
        failCurrent = reject;
        body.once('error', reject);
        // Safety net for ZIPs that skipped the size check: stop once the packed bytes pass the limit.
        body.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_ZIP_BYTES) body.destroy(new Error('ZIP size limit exceeded'));
        });
        archive.once('entry', () => resolve());
        archive.append(body, { name: entry.name });
      });
    }
    await archive.finalize();
    // Hold the caller's zip slot until the browser has received everything.
    if (!res.writableFinished && !res.destroyed) {
      await new Promise<void>((resolve) => res.once('close', () => resolve()));
    }
  } catch (err) {
    console.error('[Zip] failed while streaming:', err instanceof Error ? err.message : err);
    archive.abort();
    res.destroy(); // headers are out: the browser sees a failed download instead of a broken file
  }
};
