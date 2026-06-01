import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { signToken } from '../utils/jwt.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { RegisterBody, LoginBody } from '../types/auth.types';
import { UpdateProfileBody } from '../utils/validators/profile.validators';

// ─── Register ──────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, packageId } = req.body as RegisterBody;

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
        role: 'CLIENT', // HARDCODE to prevent privilege escalation
        ...(packageId && { packageId }),
      },
    });

    // Build safe user object (exclude password)
    const { password: _, ...safeUser } = user;

    // Sign token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // Create refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' as const };
    const isFromAdminPortal = req.headers['x-portal'] === 'admin';
    const tokenName = isFromAdminPortal ? 'adminToken' : 'token';
    const refreshName = isFromAdminPortal ? 'adminRefreshToken' : 'refreshToken';

    res.cookie(tokenName, token, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie(refreshName, refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    sendSuccess(res, { user: safeUser, token, refreshToken }, 201);
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

    // Create refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' as const };
    const isFromAdminPortal = req.headers['x-portal'] === 'admin';
    const tokenName = isFromAdminPortal ? 'adminToken' : 'token';
    const refreshName = isFromAdminPortal ? 'adminRefreshToken' : 'refreshToken';

    res.cookie(tokenName, token, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie(refreshName, refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    sendSuccess(res, { user: safeUser, token, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};

// ─── Refresh Token ─────────────────────────────
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const isFromAdminPortal = req.headers['x-portal'] === 'admin';
    const tokenName = isFromAdminPortal ? 'adminToken' : 'token';
    const refreshName = isFromAdminPortal ? 'adminRefreshToken' : 'refreshToken';
    
    const refreshToken = req.cookies?.[refreshName] || req.body.refreshToken;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      sendError(res, 'Invalid or expired refresh token', 401);
      return;
    }

    const user = storedToken.user;
    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 403);
      return;
    }

    // Generate new tokens
    const newToken = signToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Rotate token (delete old, create new)
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' as const };
    res.cookie(tokenName, newToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie(refreshName, newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    sendSuccess(res, { message: 'Token refreshed', token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};

// ─── Logout ────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const isFromAdminPortal = req.headers['x-portal'] === 'admin';
    const tokenName = isFromAdminPortal ? 'adminToken' : 'token';
    const refreshName = isFromAdminPortal ? 'adminRefreshToken' : 'refreshToken';

    const refreshToken = req.cookies?.[refreshName] || req.body.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.clearCookie(tokenName);
    res.clearCookie(refreshName);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
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
        igUsername: true,
        igBio: true,
        igFollowers: true,
        igFollowing: true,
        igPostsCount: true,
        igProfilePic: true,
        igHighlights: true,
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

// ─── Update Profile (Protected) ────────────────
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = req.body as UpdateProfileBody;

    const updateData: Record<string, unknown> = {};
    if (body.igUsername !== undefined) updateData.igUsername = body.igUsername;
    if (body.igBio !== undefined) updateData.igBio = body.igBio;
    if (body.igFollowers !== undefined) updateData.igFollowers = body.igFollowers;
    if (body.igFollowing !== undefined) updateData.igFollowing = body.igFollowing;
    if (body.igPostsCount !== undefined) updateData.igPostsCount = body.igPostsCount;
    if (body.igProfilePic !== undefined) updateData.igProfilePic = body.igProfilePic;
    if (body.igHighlights !== undefined) updateData.igHighlights = body.igHighlights;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password: _, ...safeUser } = updated;
    sendSuccess(res, { user: safeUser });
  } catch (err) {
    console.error('Update profile error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};
