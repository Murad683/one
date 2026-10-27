// Video retention as shown in the admin list (rules: backend/src/utils/retention.ts).
// expiresAt: the day the client stops seeing the video (60 days after it was first
// ready); the files are deleted PURGE_BUFFER_DAYS after it was hidden. The server
// sends expiresAt as null while the rule is switched off.
import { formatAddedDay } from './deliverableList';

const DAY_MS = 24 * 60 * 60 * 1000;
export const PURGE_BUFFER_DAYS = 7;

export interface RetentionFields {
  expiresAt?: string | null;
  hiddenAt?: string | null;
  mediaDeletedAt?: string | null;
}

/** Whole days until `target`, rounded up; 0 once it has passed. */
export const daysUntil = (target: string, now: number = Date.now()): number => {
  const time = new Date(target).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.ceil((time - now) / DAY_MS));
};

export interface RetentionNote {
  text: string;
  tone: 'muted' | 'warning' | 'deleted';
}

/** The small line under the status badge, or null when the rule does not apply. */
export const retentionNote = (d: RetentionFields, now: number = Date.now()): RetentionNote | null => {
  if (d.mediaDeletedAt) {
    return { text: `Fayl silinib (${formatAddedDay(d.mediaDeletedAt)})`, tone: 'deleted' };
  }
  if (d.hiddenAt) {
    const purgeAt = new Date(new Date(d.hiddenAt).getTime() + PURGE_BUFFER_DAYS * DAY_MS).toISOString();
    const days = daysUntil(purgeAt, now);
    return {
      text: days > 0 ? `Müştəridən gizlədilib · fayllar ${days} gün sonra silinir` : 'Müştəridən gizlədilib · fayllar tezliklə silinir',
      tone: 'warning',
    };
  }
  if (d.expiresAt) {
    const days = daysUntil(d.expiresAt, now);
    return { text: days > 0 ? `${days} gün sonra silinəcək` : 'Tezliklə silinəcək', tone: days <= 7 ? 'warning' : 'muted' };
  }
  return null;
};

/** Why no new file may be uploaded into this row (the server refuses too, 409). */
export const retentionLockReason = (d: RetentionFields | null): string | null => {
  if (!d) return null;
  if (d.mediaDeletedAt) return 'Saxlama müddəti bitdiyi üçün bu videonun faylları silinib.';
  if (d.hiddenAt) return 'Saxlama müddəti bitib: müştəri bu videonu görmür, ona yeni fayl yükləmək olmur.';
  return null;
};
