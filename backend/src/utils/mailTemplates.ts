/**
 * The mails clients receive about the 60-day video retention (Azerbaijani).
 * Pure: every function returns { subject, html, text }. Video titles come from
 * admins and are HTML-escaped. Dates are Baku calendar days (DD.MM.YYYY).
 */
import { NOTICE_DAYS, bakuDay, bakuHour } from './notices';
import { RETENTION_DAYS } from './retention';

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

const DEFAULT_FOOTER = 'Bu mail avtomatik göndərilib, ona cavab verməyin. Sualınız varsa agentliklə əlaqə saxlayın.';

const layout = (heading: string, bodyHtml: string, footer: string = DEFAULT_FOOTER): string => `<!doctype html>
<html lang="az"><body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">${BRAND}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${heading}</h1>
${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#71717a;">${footer}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

const button = (url: string, label: string): string =>
  `<p style="margin:20px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;">${escapeHtml(label)}</a></p>`;

/** Sent once to a newly entered real address: a welcome, the portal, and the 60-day rule (the part that matters, boxed). */
export const infoMail = (clientName: string, portalUrl: string): MailContent => {
  const name = escapeHtml(clientName);
  const p = 'margin:0 0 12px;font-size:15px;line-height:1.6;';
  return {
    subject: `${BRAND} ailəsinə xoş gəlmisiniz`,
    html: layout(
      `${BRAND} ailəsinə xoş gəlmisiniz!`,
      `<p style="${p}">Salam, ${name}! 👋</p>
<p style="${p}">Bizimlə olduğunuz üçün çox şadıq. Sizin üçün müştəri portalını hazırlamışıq. Buradan bütün vacib məlumatlara rahatlıqla baxa bilərsiniz:</p>
<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.7;">
<li><strong>Çatdırılmalar</strong> — işlərinizi izləyin.</li>
<li><strong>Ödənişlər</strong> — ödəniş məlumatlarınızı yoxlayın.</li>
<li><strong>Dəstək</strong> — sualınız yaranarsa, bizə yazın.</li>
</ul>
<p style="${p}">Portala bu e-poçt ünvanınız və şifrənizlə daxil ola bilərsiniz.</p>
<div style="margin:16px 0;padding:14px 16px;background:#fff7e0;border:1px solid #f5c542;border-radius:10px;">
<p style="margin:0 0 8px;font-size:15px;line-height:1.5;"><strong>Vacib xatırlatma: videolarınız ${RETENTION_DAYS} gün saxlanılır</strong> ⚠️</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Portalda yerləşdirilən videolar ${RETENTION_DAYS} gün ərzində saxlanılır, sonra isə <strong>birdəfəlik silinir</strong> və onları bərpa etmək mümkün olmur. Narahat olmayın, silinməyə ${NOTICE_DAYS} gün qalmış bu e-poçt ünvanına sizə xatırlatma göndərəcəyik.</p>
<p style="margin:0;font-size:15px;line-height:1.6;"><strong>Videolarınızı itirməmək üçün vaxtında endirməyi unutmayın!</strong></p>
</div>
<p style="${p}">Hər hansı sualınız olsa, agentliyinizlə əlaqə saxlaya bilərsiniz. Sizə kömək etməkdən məmnun olarıq. 😊</p>
<p style="margin:0;font-size:15px;line-height:1.6;">Uğurlar arzulayırıq!<br><strong>${BRAND} komandası</strong></p>${button(portalUrl, 'Portala daxil ol')}`,
      'Bu mail avtomatik göndərilir, ona cavab yazmayın.',
    ),
    // The plain-text version has no emoji.
    text: `Salam, ${clientName}!

${BRAND} ailəsinə xoş gəlmisiniz!

Bizimlə olduğunuz üçün çox şadıq. Sizin üçün müştəri portalını hazırlamışıq. Buradan bütün vacib məlumatlara rahatlıqla baxa bilərsiniz:

- Çatdırılmalar — işlərinizi izləyin.
- Ödənişlər — ödəniş məlumatlarınızı yoxlayın.
- Dəstək — sualınız yaranarsa, bizə yazın.

Portala bu e-poçt ünvanınız və şifrənizlə daxil ola bilərsiniz.

VACİB XATIRLATMA: videolarınız ${RETENTION_DAYS} gün saxlanılır
Portalda yerləşdirilən videolar ${RETENTION_DAYS} gün ərzində saxlanılır, sonra isə birdəfəlik silinir və onları bərpa etmək mümkün olmur. Narahat olmayın, silinməyə ${NOTICE_DAYS} gün qalmış bu e-poçt ünvanına sizə xatırlatma göndərəcəyik.
Videolarınızı itirməmək üçün vaxtında endirməyi unutmayın!

Hər hansı sualınız olsa, agentliyinizlə əlaqə saxlaya bilərsiniz. Sizə kömək etməkdən məmnun olarıq.

Uğurlar arzulayırıq!
${BRAND} komandası

Portal: ${portalUrl}

Bu mail avtomatik göndərilir, ona cavab yazmayın.`,
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
