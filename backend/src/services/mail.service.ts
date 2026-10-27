/**
 * Sending mail. Everything that sends goes through sendMail(), so changing the
 * provider (Resend today, e.g. Brevo later) touches this file only.
 *
 * Config (backend/.env, never in the repository): RESEND_API_KEY, MAIL_FROM.
 */

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 15_000;
const DEFAULT_FROM = 'ONE Agency <noreply@mail.ourneweye.com>';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Same key = same mail: the provider answers a repeated request with the first
   * result instead of sending again (valid 24 h). Protects against a double send
   * when a run is retried after the "sent" mark could not be saved.
   */
  idempotencyKey: string;
}

export class MailError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'MailError';
  }
}

export const isMailConfigured = (env: NodeJS.ProcessEnv = process.env): boolean => Boolean((env.RESEND_API_KEY || '').trim());

export const getMailFrom = (env: NodeJS.ProcessEnv = process.env): string => (env.MAIL_FROM || '').trim() || DEFAULT_FROM;

/** Sends one mail and returns the provider's id. Throws MailError on any failure. */
export async function sendMail(message: MailMessage, fetchImpl: typeof fetch = fetch): Promise<string> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new MailError('RESEND_API_KEY is not set');

  let response: Response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify({
        from: getMailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new MailError(`Mail request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    // The body names the problem (invalid address, rate limit...) and never contains the key.
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw new MailError(`Resend answered ${response.status}: ${detail}`, response.status);
  }
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  return data.id ?? '';
}
