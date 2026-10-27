import crypto from 'crypto';

/**
 * Verifies a Svix-signed webhook (Resend uses Svix). Manual scheme from
 * https://docs.svix.com/receiving/verifying-payloads/how-manual :
 *   signed content = `${svix-id}.${svix-timestamp}.${raw body}`
 *   key            = base64-decoded secret after the "whsec_" prefix
 *   signature      = base64(HMAC-SHA256(key, signed content)), header holds
 *                    space-separated "v1,<signature>" entries.
 */
export interface SvixHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export const verifySvixSignature = (
  secret: string,
  headers: SvixHeaders,
  rawBody: string,
  nowMs: number = Date.now(),
  toleranceSeconds: number = SVIX_TOLERANCE_SECONDS,
): boolean => {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  // A stale or future timestamp is a replay.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > toleranceSeconds) return false;

  const keyBase64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length === 0) return false;

  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
};
