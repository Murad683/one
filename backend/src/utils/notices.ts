/**
 * Retention notice mails: who may receive them and when one is due. Pure (no
 * database, no network) so every rule can be unit-tested.
 *
 * A video is hidden from the client at `expiresAt` (utils/retention.ts) and its
 * files are deleted a week later. The client can only download until it is
 * hidden, so the warnings are counted to that moment: 7 days and 1 day before.
 */
import { getRetentionMode } from './retention';
import { normalizeEmail } from './email';

export const NOTICE_FIRST_DAYS = 7;
export const NOTICE_LAST_DAYS = 1;
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
  notice7SentAt: Date | null;
  notice1SentAt: Date | null;
}

export type NoticeLevel = 7 | 1;

/**
 * Which warning (if any) this video needs now. The 1-day warning wins when both
 * are due (a client added late): the video then gets both marked as sent.
 */
export const dueNotice = (video: NoticeVideo, now: Date): NoticeLevel | null => {
  if (!video.expiresAt || video.hiddenAt || video.mediaDeletedAt) return null;
  const left = bakuDaysLeft(video.expiresAt, now);
  if (left < 0) return null; // already past: the retention job hides it, a warning would be too late
  if (left <= NOTICE_LAST_DAYS && !video.notice1SentAt) return 1;
  if (left <= NOTICE_FIRST_DAYS && !video.notice7SentAt) return 7;
  return null;
};

/** Mailing is allowed once per client per Baku day. */
export const alreadyMailedToday = (lastNoticeMailAt: Date | null | undefined, now: Date): boolean =>
  Boolean(lastNoticeMailAt) && bakuDay(new Date(lastNoticeMailAt as Date)) === bakuDay(now);

/** The address the information mail has not been sent to yet (a changed address is informed again). */
export const needsInfoMail = (user: { email: string; infoMailSentTo?: string | null }): boolean =>
  normalizeEmail(user.email) !== normalizeEmail(user.infoMailSentTo ?? '');
