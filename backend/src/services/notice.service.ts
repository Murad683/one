import crypto from 'crypto';
import prisma from '../utils/prisma';
import { hasRetainedMedia } from '../utils/retention';
import {
  MAX_MAILS_PER_RUN,
  alreadyMailedToday,
  bakuDay,
  bakuDaysLeft,
  canReceiveNotices,
  dueNotice,
  isSendingHour,
  needsInfoMail,
  type NoticeLevel,
} from '../utils/notices';
import { infoMail, noticeMail, type MailContent, type NoticeItem } from '../utils/mailTemplates';
import { normalizeEmail } from '../utils/email';
import { MailError, sendMail, type MailMessage } from './mail.service';

const log = (message: string) => console.log(`[Notices] ${message}`);

export type Mailer = (message: MailMessage) => Promise<string>;

export interface NoticeRunOptions {
  /** Actually send. False = only report what would be sent. */
  act: boolean;
  now?: Date;
  /** Skip the Baku 10:00-20:00 window (manual runs). */
  ignoreSendingHours?: boolean;
  mailer?: Mailer;
}

export interface PlannedMail {
  userId: string;
  to: string;
  kind: 'notice' | 'info';
  videoIds: string[];
  subject: string;
}

export interface NoticeRunResult {
  outsideHours: boolean;
  planned: PlannedMail[];
  sent: number;
  failed: number;
  /** Addresses the provider rejected as invalid: marked so they are not retried every hour. */
  rejected: string[];
  /** The run stopped early (bad API key, rate limit). */
  aborted: string | null;
}

// The public client portal. FRONTEND_URL is the Vercel preview address, not what clients should see.
export const portalUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.PORTAL_URL || '').trim() || 'https://www.ourneweye.com/portal';

const shortHash = (parts: string[]): string => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);

/**
 * One pass of the notice rule: a mail to each client whose videos are about to
 * leave the portal (7 days / 1 day before), and once to a newly entered address.
 * Every mail is sent first and recorded second; the idempotency key (client, day
 * and exact content) makes a retry after a failed save harmless.
 */
export async function runNotices(options: NoticeRunOptions): Promise<NoticeRunResult> {
  const now = options.now ?? new Date();
  const mailer = options.mailer ?? sendMail;
  const result: NoticeRunResult = { outsideHours: false, planned: [], sent: 0, failed: 0, rejected: [], aborted: null };

  if (!options.ignoreSendingHours && !isSendingHour(now)) {
    result.outsideHours = true;
    return result;
  }

  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT', isActive: true, emailBouncedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      emailBouncedAt: true,
      infoMailSentTo: true,
      lastNoticeMailAt: true,
      deliverables: {
        where: { status: 'READY', expiresAt: { not: null }, hiddenAt: null, mediaDeletedAt: null },
        select: {
          id: true,
          title: true,
          files: true,
          expiresAt: true,
          hiddenAt: true,
          mediaDeletedAt: true,
          notice7SentAt: true,
          notice1SentAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const url = portalUrl();

  for (const client of clients) {
    if (result.planned.length >= MAX_MAILS_PER_RUN) break;
    if (!canReceiveNotices(client) || alreadyMailedToday(client.lastNoticeMailAt, now)) continue;

    const email = normalizeEmail(client.email);
    const due = client.deliverables
      .filter((d) => hasRetainedMedia(d.files))
      .map((d) => ({ video: d, level: dueNotice(d, now) }))
      .filter((d): d is { video: (typeof client.deliverables)[number]; level: NoticeLevel } => d.level !== null);

    let kind: 'notice' | 'info';
    let content: MailContent;
    let key: string;
    if (due.length > 0) {
      kind = 'notice';
      const items: NoticeItem[] = due.map(({ video }) => ({
        title: video.title,
        expiresAt: video.expiresAt as Date,
        daysLeft: bakuDaysLeft(video.expiresAt as Date, now),
      }));
      content = noticeMail(client.name, items, url);
      key = `notice-${client.id}-${bakuDay(now)}-${shortHash([email, ...due.map((d) => `${d.video.id}:${d.level}`).sort()])}`;
    } else if (needsInfoMail(client)) {
      kind = 'info';
      content = infoMail(client.name, url);
      key = `info-${client.id}-${shortHash([email])}`;
    } else {
      continue;
    }

    const planned: PlannedMail = {
      userId: client.id,
      to: email,
      kind,
      videoIds: due.map((d) => d.video.id),
      subject: content.subject,
    };
    result.planned.push(planned);
    if (!options.act) continue;

    try {
      await mailer({ to: email, subject: content.subject, html: content.html, text: content.text, idempotencyKey: key });
    } catch (err) {
      result.failed += 1;
      const status = err instanceof MailError ? err.status : undefined;
      console.error(`[Notices] mail to client ${client.id} failed:`, err instanceof Error ? err.message : err);
      if (status === 401 || status === 403 || status === 429) {
        // The key or the account is the problem, not this client: stop instead of failing for everyone.
        result.aborted = `Resend answered ${status}`;
        break;
      }
      if (status === 400 || status === 422) {
        // This address is invalid: stop retrying it every hour; the admin sees "Mail çatmadı" and fixes it.
        await prisma.user.update({ where: { id: client.id }, data: { emailBouncedAt: now } }).catch(() => {});
        result.rejected.push(email);
      }
      continue;
    }
    result.sent += 1;

    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: client.id }, data: { lastNoticeMailAt: now, infoMailSentTo: email } }),
        ...due.map(({ video, level }) =>
          prisma.deliverable.update({
            where: { id: video.id },
            data: level === 1 ? { notice7SentAt: now, notice1SentAt: now } : { notice7SentAt: now },
          }),
        ),
      ]);
    } catch (err) {
      // Mail is out but not recorded. The next run builds the same idempotency key, so it is not sent twice.
      console.error(`[Notices] mail to client ${client.id} sent but not recorded:`, err);
    }
  }

  const tag = options.act ? 'sent' : 'would send';
  if (result.planned.length > 0) {
    log(`${tag} ${options.act ? result.sent : result.planned.length} mail(s)${result.failed ? `, ${result.failed} failed` : ''}`);
  }
  if (result.aborted) log(`run stopped: ${result.aborted}`);
  return result;
}

/** Sends the three mail types with sample data to ONE address (manual check of the texts). */
export async function sendSamples(to: string, mailer: Mailer = sendMail, now: Date = new Date()): Promise<string[]> {
  const url = portalUrl();
  const day = 24 * 60 * 60 * 1000;
  const items = (days: number): NoticeItem[] => [
    { title: 'Nümunə video 1', expiresAt: new Date(now.getTime() + days * day), daysLeft: days },
    { title: 'Nümunə video 2', expiresAt: new Date(now.getTime() + days * day), daysLeft: days },
  ];
  const samples: Array<[string, MailContent]> = [
    ['info', infoMail('Nümunə Müştəri', url)],
    ['7 gün', noticeMail('Nümunə Müştəri', items(7), url)],
    ['1 gün', noticeMail('Nümunə Müştəri', items(1), url)],
  ];
  const sent: string[] = [];
  for (const [label, content] of samples) {
    await mailer({
      to: normalizeEmail(to),
      subject: `[NÜMUNƏ] ${content.subject}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `sample-${label}-${Date.now()}`,
    });
    sent.push(label);
  }
  return sent;
}
