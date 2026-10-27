// Video retention countdown for the client portal (rules: backend/src/utils/retention.ts).
// expiresAt is the moment the video leaves the portal; the server sends null
// when the rule does not apply.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Last stretch before removal: the countdown turns red. */
export const RETENTION_WARNING_DAYS = 7;

/** Whole days left, rounded up; 0 once it has passed. */
export const daysUntil = (target: string, now: number = Date.now()): number => {
  const time = new Date(target).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.ceil((time - now) / DAY_MS));
};

export const retentionLabel = (days: number): string =>
  days > 0 ? `${days} gün sonra silinəcək` : 'Bu gün silinəcək';
