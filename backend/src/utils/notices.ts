/**
 * Retention notice mails: who may receive them and when one is due. Pure (no
 * database, no network) so every rule can be unit-tested.
 *
 * A video leaves the portal at `expiresAt` (utils/retention.ts). The client can
 * only download until then, so the single warning is counted to that moment:
 * NOTICE_DAYS before it. One mail also covers the videos that follow within
 * NOTICE_GROUP_DAYS, so a client with many videos gets few mails (the Resend
 * plan has a limit).
 */
import { getRetentionMode } from './retention';
import { normalizeEmail } from './email';

/** The warning goes out when the video has this many Baku days (or fewer) left. */
export const NOTICE_DAYS = 3;
/** ...and it also lists every other unwarned video leaving within this many days after the first one. */
export const NOTICE_GROUP_DAYS = 5;
/** Mails go out only in the Baku working day: 10:00 up to (not including) 20:00. */
export const SEND_HOUR_FROM = 10;
export const SEND_HOUR_TO = 20;
/** One run sends at most this many mails (the Resend free plan allows 100 a day). */
export const MAX_MAILS_PER_RUN = 50;

/** Addresses that cannot receive mail (the domain has no mailbox) or belong to test accounts. */
const BLOCKED_DOMAINS = ['ourneweye.com'];
const BLOCKED_ADDRESSES = ['murad@gmail.com', 'karimov@gmail.com'];

const DAY_MS = 24 * 60 * 60 * 1000;
// Baku has no daylight saving: a fixed +04:00 offset is exact.
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * MAIL_MODE in backend/.env: off (default) | dry-run (only logs) | on.
 * Notices also stay off while the retention rule itself is off.
 */
export type MailMode = 'off' | 'dry-run' | 'on';

export const getMailMode = (env: NodeJS.ProcessEnv = process.env): MailMode => {
  if (getRetentionMode(env) === 'off') return 'off';
  const value = (env.MAIL_MODE || '').trim().toLowerCase();
  if (value === 'on' || value === 'dry-run') return value;
  return 'off';
};

export interface NoticeRecipient {
  email: string;
  role: string;
  isActive: boolean;
  emailBouncedAt?: Date | string | null;
}

/** True when an address is a real mailbox of an active client that did not bounce. */
export const canReceiveNotices = (user: NoticeRecipient): boolean => {
  if (user.role !== 'CLIENT' || !user.isActive || user.emailBouncedAt) return false;
  const email = normalizeEmail(user.email);
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  if (BLOCKED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return false;
  if (BLOCKED_ADDRESSES.includes(email)) return false;
  return true;
};

/** The Baku calendar day of an instant, as YYYY-MM-DD. */
export const bakuDay = (date: Date): string => new Date(date.getTime() + BAKU_OFFSET_MS).toISOString().slice(0, 10);

/** The hour (0-23) in Baku. */
export const bakuHour = (date: Date): number => new Date(date.getTime() + BAKU_OFFSET_MS).getUTCHours();

export const isSendingHour = (now: Date): boolean => {
  const hour = bakuHour(now);
  return hour >= SEND_HOUR_FROM && hour < SEND_HOUR_TO;
};

/** Whole Baku calendar days from today until the day `expiresAt` falls on (0 = that day is today). */
export const bakuDaysLeft = (expiresAt: Date, now: Date): number =>
  Math.round((Date.parse(`${bakuDay(expiresAt)}T00:00:00Z`) - Date.parse(`${bakuDay(now)}T00:00:00Z`)) / DAY_MS);

export interface NoticeVideo {
  expiresAt: Date | null;
  hiddenAt: Date | null;
  mediaDeletedAt: Date | null;
  /** Set when the warning mail covering this video went out (the column was the 7-day flag before the single warning). */
  notice7SentAt: Date | null;
}

/**
 * The videos one warning mail should list now, or [] when none is due. A video
 * is due when at most NOTICE_DAYS Baku days are left; the mail then also takes
 * every unwarned video leaving within NOTICE_GROUP_DAYS after the soonest one.
 * Already hidden, deleted, warned or past videos never qualify (a past one is
 * hidden by the retention job and a warning would be too late).
 */
export const selectNoticeBatch = <T extends NoticeVideo>(videos: T[], now: Date): T[] => {
  const open = videos
    .filter((v) => v.expiresAt && !v.hiddenAt && !v.mediaDeletedAt && !v.notice7SentAt)
    .map((v) => ({ video: v, left: bakuDaysLeft(v.expiresAt as Date, now) }))
    .filter((v) => v.left >= 0);
  const soonest = Math.min(...open.map((v) => v.left));
  if (open.length === 0 || soonest > NOTICE_DAYS) return [];
  return open.filter((v) => v.left <= soonest + NOTICE_GROUP_DAYS).map((v) => v.video);
};

/** Mailing is allowed once per client per Baku day. */
export const alreadyMailedToday = (lastNoticeMailAt: Date | null | undefined, now: Date): boolean =>
  Boolean(lastNoticeMailAt) && bakuDay(new Date(lastNoticeMailAt as Date)) === bakuDay(now);

/** The address the information mail has not been sent to yet (a changed address is informed again). */
export const needsInfoMail = (user: { email: string; infoMailSentTo?: string | null }): boolean =>
  normalizeEmail(user.email) !== normalizeEmail(user.infoMailSentTo ?? '');
