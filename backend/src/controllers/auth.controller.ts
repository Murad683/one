import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { signToken } from '../utils/jwt.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { RegisterBody, LoginBody } from '../types/auth.types';

// ─── Register ──────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, packageId } = req.body as RegisterBody;

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      sendError(res, 'Email already in use', 409);
      return;
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ...(role && { role }),
        ...(packageId && { packageId }),
      },
    });

    // Build safe user object (exclude password)
    const { password: _, ...safeUser } = user;

    // Sign token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    sendSuccess(res, { user: safeUser, token }, 201);
  } catch (err) {
    console.error('Register error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};

// ─── Login ─────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginBody;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    // Check active status
    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 403);
      return;
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    // Build safe user object (exclude password)
    const { password: _, ...safeUser } = user;

    // Sign token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    sendSuccess(res, { user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};

// ─── Me (Protected) ────────────────────────────
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        package: {
          select: { id: true, name: true, priceLabel: true },
        },
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Fetch latest 5 payments and open ticket count for client dashboard
    const [latestPayments, ticketCount] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { paidAt: 'desc' },
        take: 5,
      }),
      prisma.ticket.count({
        where: { userId, status: 'OPEN' },
      }),
    ]);

    sendSuccess(res, {
      user: {
        ...user,
        latestPayments,
        openTicketCount: ticketCount,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};
