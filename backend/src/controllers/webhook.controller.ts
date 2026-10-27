import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { verifySvixSignature } from '../utils/svix';
import { normalizeEmail } from '../utils/email';

interface ResendEvent {
  type?: string;
  data?: { to?: unknown; bounce?: { type?: string } };
}

/** A permanent bounce or a spam complaint: stop mailing this address until an admin changes it. */
export const shouldStopMailing = (event: ResendEvent): boolean => {
  if (event.type === 'email.complained') return true;
  // Temporary failures (full mailbox, server down) are not a reason to give up on an address.
  return event.type === 'email.bounced' && String(event.data?.bounce?.type ?? '').toLowerCase() === 'permanent';
};

// POST /api/v1/webhooks/resend — registered with express.raw() in index.ts: the
// signature covers the exact bytes Resend sent, so the body must not be parsed first.
export const resendWebhook = async (req: Request, res: Response): Promise<void> => {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    res.status(503).json({ success: false, message: 'Webhook is not configured' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const valid = verifySvixSignature(
    secret,
    {
      id: req.header('svix-id'),
      timestamp: req.header('svix-timestamp'),
      signature: req.header('svix-signature'),
    },
    rawBody,
  );
  if (!valid) {
    res.status(400).json({ success: false, message: 'Invalid signature' });
    return;
  }

  try {
    const event = JSON.parse(rawBody) as ResendEvent;
    if (shouldStopMailing(event) && Array.isArray(event.data?.to)) {
      const addresses = (event.data!.to as unknown[]).filter((a): a is string => typeof a === 'string').map(normalizeEmail);
      if (addresses.length > 0) {
        const { count } = await prisma.user.updateMany({
          where: { email: { in: addresses }, emailBouncedAt: null },
          data: { emailBouncedAt: new Date() },
        });
        if (count > 0) console.log(`[Notices] ${event.type}: ${count} address(es) marked`);
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Resend webhook error:', err);
    // 500 makes Resend retry later.
    res.status(500).json({ success: false, message: 'Failed to process event' });
  }
};
