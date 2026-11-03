import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
  }
  return secret;
};

export const signToken = (payload: JwtPayload): string => {
  const secret = getSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const options: SignOptions = {
    expiresIn: expiresIn as unknown as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload }, secret, options);
};

/**
 * One-shot download ticket for the "download all as ZIP" link. A browser
 * navigation cannot carry the Authorization header, and a long-lived token in a
 * URL would leak, so the page first asks (authenticated) for a ticket that is
 * valid for one deliverable and 60 seconds only.
 */
export interface ZipTicket {
  deliverableId: string;
  userId: string;
  kind: 'client' | 'staff';
}

const ZIP_TICKET_SECONDS = 60;

export const signZipTicket = (ticket: ZipTicket): string =>
  jwt.sign({ ...ticket, purpose: 'zip' }, getSecret(), { expiresIn: ZIP_TICKET_SECONDS });

export const verifyZipTicket = (token: string): ZipTicket => {
  try {
    const decoded = jwt.verify(token, getSecret()) as Record<string, unknown>;
    if (decoded.purpose !== 'zip' || typeof decoded.deliverableId !== 'string' || typeof decoded.userId !== 'string') {
      throw new Error('wrong ticket');
    }
    return {
      deliverableId: decoded.deliverableId,
      userId: decoded.userId,
      kind: decoded.kind === 'staff' ? 'staff' : 'client',
    };
  } catch {
    throw new Error('Invalid or expired ticket');
  }
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = getSecret();
  try {
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    return {
      id: decoded.id as string,
      email: decoded.email as string,
      role: decoded.role as JwtPayload['role'],
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
};
