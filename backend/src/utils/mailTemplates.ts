/**
 * The mails clients receive about the 60-day video retention (Azerbaijani).
 * Pure: every function returns { subject, html, text }. Video titles come from
 * admins and are HTML-escaped. Dates are Baku calendar days (DD.MM.YYYY).
 */
import { NOTICE_DAYS, bakuDay, bakuHour } from './notices';

export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

export interface NoticeItem {
  title: string;
  /** The moment the video leaves the portal. */
  expiresAt: Date;
  /** Whole Baku days from today until that day. */
  daysLeft: number;
}

const BRAND = 'ONE Agency';

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** "2026-12-26" -> "26.12.2026". */
export const formatDay = (date: Date): string => {
  const [y, m, d] = bakuDay(date).split('-');
  return `${d}.${m}.${y}`;
};

/** "26.12.2026, saat 17:59-dək": the video is hidden at that minute, not at the end of the day. */
export const formatDeadline = (date: Date): string => {
  const minutes = String(date.getUTCMinutes()).padStart(2, '0'); // Baku is a whole number of hours from UTC
  return `${formatDay(date)}, saat ${String(bakuHour(date)).padStart(2, '0')}:${minutes}-dək`;
};

const daysWord = (days: number): string => (days <= 0 ? 'bu gün' : days === 1 ? 'sabah' : `${days} gün sonra`);

const layout = (heading: string, bodyHtml: string): string => `<!doctype html>
<html lang="az"><body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">${BRAND}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${heading}</h1>
${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#71717a;">Bu mail avtomatik göndərilib, ona cavab verməyin. Sualınız varsa agentliklə əlaqə saxlayın.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

const button = (url: string, label: string): string =>
  `<p style="margin:20px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;">${escapeHtml(label)}</a></p>`;

/** Sent once to a newly entered real address: a welcome and the 60-day rule. */
export const infoMail = (clientName: string, portalUrl: string): MailContent => {
  const name = escapeHtml(clientName);
  return {
    subject: `${BRAND} portalına xoş gəlmisiniz`,
    html: layout(
      `${BRAND} portalına xoş gəlmisiniz`,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Salam, ${name}.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Bu e-poçt ünvanı ${BRAND} müştəri portalındakı hesabınıza bağlıdır. Portalda sizin üçün hazırlanan işləri (video və şəkillər) <strong>Çatdırılmalar</strong> bölməsində görüb endirə, <strong>Ödənişlər</strong> bölməsində ödənişlərinizi izləyə, <strong>Dəstək</strong> bölməsindən komandamıza sorğu göndərə bilərsiniz.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><strong>Giriş:</strong> portala bu e-poçt ünvanı və şifrənizlə daxil olursunuz.</p>
<p style="margin:0;font-size:15px;line-height:1.6;"><strong>Vacib:</strong> videoların saxlanma müddəti <strong>60 gündür</strong>. Bu müddət bitəndə video portaldan birdəfəlik silinir. Videoları vaxtında endirə bilməyiniz üçün silinməsinə ${NOTICE_DAYS} gün qalmış bu e-poçt ünvanına xəbərdarlıq göndərəcəyik.</p>${button(portalUrl, 'Portala daxil ol')}`,
    ),
    text: `Salam, ${clientName}.

Bu e-poçt ünvanı ${BRAND} müştəri portalındakı hesabınıza bağlıdır. Portalda sizin üçün hazırlanan işləri (video və şəkillər) Çatdırılmalar bölməsində görüb endirə, Ödənişlər bölməsində ödənişlərinizi izləyə, Dəstək bölməsindən komandamıza sorğu göndərə bilərsiniz.

Giriş: portala bu e-poçt ünvanı və şifrənizlə daxil olursunuz.

Vacib: videoların saxlanma müddəti 60 gündür. Bu müddət bitəndə video portaldan birdəfəlik silinir. Videoları vaxtında endirə bilməyiniz üçün silinməsinə ${NOTICE_DAYS} gün qalmış bu e-poçt ünvanına xəbərdarlıq göndərəcəyik.

Portal: ${portalUrl}

Bu mail avtomatik göndərilib, ona cavab verməyin.`,
  };
};

/** The warning mail (one per group of videos). `items` are listed by the date they leave the portal. */
export const noticeMail = (clientName: string, items: NoticeItem[], portalUrl: string): MailContent => {
  const sorted = [...items].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  const soonest = Math.min(...sorted.map((i) => i.daysLeft));
  const urgent = soonest <= 1;
  const many = sorted.length > 1;
  // With several videos only the first one is that close, so the subject says "one of your videos".
  const subject = `${BRAND}: ${many ? 'videolarınızdan biri' : 'videonuz'} ${daysWord(soonest)} silinəcək`;
  const heading = urgent ? 'Videoları bu gün endirin' : 'Videoların saxlanma müddəti bitir';
  const name = escapeHtml(clientName);

  const rows = sorted
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-top:1px solid #e4e4e7;font-size:15px;">${escapeHtml(i.title)}</td><td style="padding:8px 0 8px 12px;border-top:1px solid #e4e4e7;font-size:14px;color:#52525b;text-align:right;"><span style="white-space:nowrap;">${formatDeadline(i.expiresAt)}</span><br><span style="font-size:12px;color:#71717a;">${daysWord(i.daysLeft)}</span></td></tr>`,
    )
    .join('');

  const lead = urgent
    ? 'Aşağıdakı videoların saxlanma müddəti bitmək üzrədir. Göstərilən vaxtdan sonra video <strong>birdəfəlik silinir, yükləmək və geri qaytarmaq mümkün olmur</strong>.'
    : 'Aşağıdakı videoların saxlanma müddəti tezliklə bitir. Həmin vaxtdan sonra video <strong>birdəfəlik silinir, yükləmək və geri qaytarmaq mümkün olmur</strong>.';

  const html = layout(
    heading,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Salam, ${name}.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${lead}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">${rows}</table>
<p style="margin:12px 0 0;font-size:15px;line-height:1.6;">Videoları saxlamaq istəyirsinizsə, <strong>göstərilən vaxta qədər</strong> portaldan endirin.</p>${button(portalUrl, 'Portala daxil ol')}`,
  );

  const list = sorted.map((i) => `- ${i.title}: ${formatDeadline(i.expiresAt)} (${daysWord(i.daysLeft)})`).join('\n');
  const text = `Salam, ${clientName}.

${urgent ? 'Aşağıdakı videoların saxlanma müddəti bitmək üzrədir.' : 'Aşağıdakı videoların saxlanma müddəti tezliklə bitir.'} Həmin vaxtdan sonra video birdəfəlik silinir, yükləmək və geri qaytarmaq mümkün olmur.

${list}

Videoları saxlamaq istəyirsinizsə, göstərilən vaxta qədər portaldan endirin.

Portal: ${portalUrl}

Bu mail avtomatik göndərilib, ona cavab verməyin.`;

  return { subject, html, text };
};
