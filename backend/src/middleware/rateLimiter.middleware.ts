import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Rate-limit key = the real visitor IP.
 *
 * Traffic reaches this server only through the Cloudflare Tunnel (80/443 are
 * firewalled), so every request arrives from cloudflared on loopback and
 * Cloudflare has already set `CF-Connecting-IP` to the true client IP. Without
 * this, `req.ip` would be 127.0.0.1 for everyone and per-IP limiting would be
 * meaningless. Falls back to `req.ip` for local/dev.
 */
const clientKey = (req: Request): string => {
  const cf = req.headers['cf-connecting-ip'];
  const ip = (typeof cf === 'string' && cf.trim()) || req.ip || '';
  return ipKeyGenerator(ip);
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per IP per window
  keyGenerator: clientKey,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => req.method === 'OPTIONS',
});

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per IP per minute
  keyGenerator: clientKey,
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// Public site media: cached by Cloudflare, so the origin only sees misses. Generous per-visitor cap that only stops abuse.
export const mediaRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: clientKey,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false,
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 upload requests per IP per minute
  keyGenerator: clientKey,
  message: {
    success: false,
    message: 'Too many upload attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// Help assistant: limited per signed-in user (these routes run after auth),
// plus a shared cap so one Gemini API key's quota can't be exhausted by all
// users together.
const assistantUserKey = (req: Request): string => req.user?.id ?? clientKey(req);

export const assistantRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // 6 questions per user per minute
  keyGenerator: assistantUserKey,
  message: {
    success: false,
    message: 'Çox tez-tez sual verirsiniz, bir az gözləyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

export const assistantDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 100 questions per user per day
  keyGenerator: assistantUserKey,
  message: {
    success: false,
    message: 'Bu gün üçün sual limiti doldu, sabah yenidən cəhd edin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

export const assistantGlobalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 questions per minute across all users
  keyGenerator: () => 'assistant-global',
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Köməkçi hazırda məşğuldur, bir az sonra yenidən cəhd edin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

export const contactRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 contact requests per IP per minute
  keyGenerator: clientKey,
  message: {
    success: false,
    message: 'Too many contact requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
