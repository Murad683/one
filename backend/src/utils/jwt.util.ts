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
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = {
    expiresIn: expiresIn as unknown as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload }, secret, options);
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
