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
