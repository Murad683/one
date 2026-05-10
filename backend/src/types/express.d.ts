/* eslint-disable @typescript-eslint/no-unused-vars */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'ADMIN' | 'CLIENT';
      };
    }
  }
}

export {};
