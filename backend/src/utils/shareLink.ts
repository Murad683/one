/**
 * Client share links (/share/:token). Pure: no database access here.
 *
 * A link is the client's shareToken. shareTokenExpiresAt says until when it opens:
 *   null  — never expires (only revoking closes it)
 *   date  — opens until then
 * Revoking clears both, so a missing token always means "no link".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const SHARE_DURATIONS = ['never', '30d'] as const;
export type ShareDuration = (typeof SHARE_DURATIONS)[number];

/** Used when a request names no duration (the admin panel before durations existed). */
export const LEGACY_SHARE_LINK_TTL_MS = 7 * DAY_MS;

/** The expiry a duration gives a link created or changed at `now`; null = never expires. */
export const expiryFor = (duration: ShareDuration, now: Date = new Date()): Date | null =>
  duration === 'never' ? null : new Date(now.getTime() + 30 * DAY_MS);

/** The share link's last view is written at most this often (opening the page does not write every time). */
export const SHARE_VIEW_WRITE_INTERVAL_MS = 10 * 60 * 1000;

interface ShareLinkOwner {
  role: string;
  shareToken: string | null;
  shareTokenExpiresAt: Date | null;
}

/** True when the link opens: a client with a token that has not expired. */
export const isShareLinkValid = (client: ShareLinkOwner | null, now: Date = new Date()): boolean =>
  Boolean(
    client &&
      client.role === 'CLIENT' &&
      client.shareToken &&
      (client.shareTokenExpiresAt === null || client.shareTokenExpiresAt > now)
  );

export const shareUrlFor = (token: string | null): string | null =>
  token ? `${process.env.FRONTEND_URL}/share/${token}` : null;
