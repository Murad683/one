// Client share links: status wording shared by the share modal and the small status dots in the lists.

export type ShareDuration = 'never' | '30d';

export interface ShareLinkInfo {
  shareUrl?: string | null;
  shareTokenExpiresAt?: string | null;
  shareLastViewedAt?: string | null;
}

export type ShareLinkState = 'none' | 'active' | 'expired';

const DAY_MS = 24 * 60 * 60 * 1000;

export const shareLinkState = (link: ShareLinkInfo, now = new Date()): ShareLinkState => {
  if (!link.shareUrl) return 'none';
  if (!link.shareTokenExpiresAt) return 'active';
  return new Date(link.shareTokenExpiresAt) > now ? 'active' : 'expired';
};

/** "Aktiv · Müddətsiz", "Aktiv · 23 gün qalıb", "Vaxtı bitib · 5 gün əvvəl". */
export const shareExpiryLabel = (link: ShareLinkInfo, now = new Date()): string => {
  const state = shareLinkState(link, now);
  if (state === 'none') return 'Link yoxdur';
  if (!link.shareTokenExpiresAt) return 'Aktiv · Müddətsiz';
  const diff = new Date(link.shareTokenExpiresAt).getTime() - now.getTime();
  if (state === 'active') {
    // Rounded up: a link made 30 days long reads "30 gün qalıb", not 29.
    const days = Math.ceil(diff / DAY_MS);
    return diff < DAY_MS ? 'Aktiv · bu gün bitir' : `Aktiv · ${days} gün qalıb`;
  }
  const ago = Math.floor(-diff / DAY_MS);
  return ago < 1 ? 'Vaxtı bitib · bu gün' : `Vaxtı bitib · ${ago} gün əvvəl`;
};

const time = (d: Date) => d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });

/** "Son baxış: bu gün 14:20" / "dünən 14:20" / "12.11.2026 14:20"; "Hələ açılmayıb" when never opened. */
export const shareLastViewLabel = (link: ShareLinkInfo, now = new Date()): string => {
  if (!link.shareLastViewedAt) return 'Hələ açılmayıb';
  const seen = new Date(link.shareLastViewedAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (seen.getTime() >= startOfToday) return `Son baxış: bu gün ${time(seen)}`;
  if (seen.getTime() >= startOfToday - DAY_MS) return `Son baxış: dünən ${time(seen)}`;
  return `Son baxış: ${seen.toLocaleDateString('az-AZ')} ${time(seen)}`;
};

/** One line for tooltips and the modal. */
export const shareStatusLine = (link: ShareLinkInfo, now = new Date()): string =>
  shareLinkState(link, now) === 'none'
    ? 'Link yoxdur'
    : `${shareExpiryLabel(link, now)} · ${shareLastViewLabel(link, now)}`;
