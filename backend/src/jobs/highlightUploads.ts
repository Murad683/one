import { cleanupStaleUploads } from '../services/highlight.service';

const HOUR_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;

/**
 * Hourly: deletes highlight-editor images that were uploaded but never saved or cancelled
 * (closed tab, lost connection) after 24 hours. Independent of RETENTION_MODE: these files
 * are not linked to any client, so there is nothing to protect.
 */
const tick = async (): Promise<void> => {
  try {
    const removed = await cleanupStaleUploads();
    if (removed > 0) console.log(`[Highlights] removed ${removed} stale staged upload(s)`);
  } catch (err) {
    console.error('[Highlights] staged upload cleanup failed:', err);
  }
};

export const startHighlightUploadCleanup = (): void => {
  setTimeout(() => void tick(), FIRST_RUN_DELAY_MS).unref();
  setInterval(() => void tick(), HOUR_MS).unref();
};
