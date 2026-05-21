import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { hashPassword } from '../utils/password.util';
import { processAndStoreFile, getSecureDownloadUrl, extractStorageKey } from '../services/upload.service';

const signPaymentUrls = async (payment: any) => {
  if (payment.invoicePdfUrl) {
    try {
      payment.invoicePdfUrl = await getSecureDownloadUrl(payment.invoicePdfUrl);
    } catch (e) {
      console.warn('Failed to sign invoicePdfUrl', e);
    }
  }
  return payment;
};

// ─── GET /api/v1/admin/stats ───────────────────
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [projectsCount, servicesCount, clientsCount, unreadCount, recentMessages] = await Promise.all([
      prisma.project.count(),
      prisma.service.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.contactSubmission.count({ where: { isRead: false } }),
      prisma.contactSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    sendSuccess(res, {
      projects: projectsCount,
      services: servicesCount,
      clients: clientsCount,
      unread: unreadCount,
      recentMessages,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    sendError(res, 'Statistikaları yükləmək mümkün olmadı', 500);
  }
};

// ─── POST /api/v1/admin/payments ───────────────
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, paidAt, nextPaymentDate, invoicePdfUrl, note } = req.body;

    // Validate required fields
    if (!userId || amount === undefined || !paidAt || !nextPaymentDate) {
      sendError(res, 'userId, amount, paidAt və nextPaymentDate sahələri mütləqdir.', 400);
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendError(res, 'İstifadəçi tapılmadı', 404);
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        paidAt: new Date(paidAt),
        nextPaymentDate: new Date(nextPaymentDate),
        ...(invoicePdfUrl && { invoicePdfUrl: extractStorageKey(invoicePdfUrl) }),
        ...(note && { note }),
      },
    });

    sendSuccess(res, payment, 201);
  } catch (err) {
    console.error('createPayment error:', err);
    sendError(res, 'Ödəniş yaratmaq mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/admin/users ───────────────────
export const getClientUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        package: {
          select: { id: true, name: true, priceLabel: true },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    sendSuccess(res, users);
  } catch (err) {
    console.error('getClientUsers error:', err);
    sendError(res, 'İstifadəçiləri yükləmək mümkün olmadı', 500);
  }
};

// ─── PATCH /api/v1/admin/users/:userId/package ─
export const updateUserPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const { packageId } = req.body;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendError(res, 'İstifadəçi tapılmadı', 404);
      return;
    }

    // If packageId provided, verify package exists
    if (packageId !== null && packageId !== undefined) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } });
      if (!pkg) {
        sendError(res, 'Paket tapılmadı', 404);
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { packageId: packageId ?? null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        package: {
          select: { id: true, name: true, priceLabel: true },
        },
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('updateUserPackage error:', err);
    sendError(res, 'Paketi yeniləmək mümkün olmadı', 500);
  }
};

// ─── POST /api/v1/admin/invoices/upload ────────
export const uploadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'Fayl yüklənmədi', 400);
      return;
    }

    const result = await processAndStoreFile(req.file, 'invoices');
    sendSuccess(res, { url: result.fileUrl }, 201);
  } catch (err) {
    console.error('uploadInvoice error:', err);
    sendError(res, 'Fakturanı yükləmək mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/admin/tickets ─────────────────
export const getAllTickets = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    sendSuccess(res, tickets);
  } catch (err) {
    console.error('getAllTickets error:', err);
    sendError(res, 'Biletləri yükləmək mümkün olmadı', 500);
  }
};

// ─── PATCH /api/v1/admin/tickets/:id/status ────
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
    if (!status || !validStatuses.includes(status)) {
      sendError(res, 'Status dəyəri düzgün deyil. (OPEN, IN_PROGRESS, CLOSED)', 400);
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: Number(id) } });
    if (!ticket) {
      sendError(res, 'Bilet tapılmadı', 404);
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('updateTicketStatus error:', err);
    sendError(res, 'Bilet statusunu yeniləmək mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/admin/payments/user/:userId ──
export const getUserPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { paidAt: 'desc' },
    });
    
    const signedPayments = await Promise.all(payments.map(signPaymentUrls));
    sendSuccess(res, signedPayments);
  } catch (err) {
    console.error('getUserPayments error:', err);
    sendError(res, 'Ödənişləri yükləmək mümkün olmadı', 500);
  }
};

// ─── DELETE /api/v1/admin/payments/:id ────────
export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.payment.delete({
      where: { id: parseInt(id, 10) },
    });
    sendSuccess(res, null, 204);
  } catch (err) {
    console.error('deletePayment error:', err);
    sendError(res, 'Ödəniş silinə bilmədi', 500);
  }
};

// ─── GET /api/v1/admin/team ────────────────────
export const getAdmins = async (_req: Request, res: Response): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, admins);
  } catch (err) {
    console.error('getAdmins error:', err);
    sendError(res, 'Admin siyahısını yükləmək mümkün olmadı', 500);
  }
};

// ─── POST /api/v1/admin/team ───────────────────
export const createAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      sendError(res, 'Ad, e-poçt və şifrə mütləqdir', 400);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Bu e-poçt artıq istifadə olunur', 409);
      return;
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    sendSuccess(res, newAdmin, 201);
  } catch (err) {
    console.error('createAdminUser error:', err);
    sendError(res, 'Admin yaratmaq mümkün olmadı', 500);
  }
};

// ─── DELETE /api/v1/admin/team/:id ─────────────
export const deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const adminToDelete = await prisma.user.findUnique({ where: { id } });

    if (!adminToDelete) {
      sendError(res, 'Admin tapılmadı', 404);
      return;
    }

    if (adminToDelete.role === 'SUPER_ADMIN') {
      sendError(res, 'Super Admin silinə bilməz', 403);
      return;
    }

    if (req.user?.id === id) {
      sendError(res, 'Öz hesabınızı silə bilməzsiniz', 403);
      return;
    }

    await prisma.user.delete({ where: { id: String(id) } });
    sendSuccess(res, null, 204);
  } catch (err) {
    console.error('deleteAdminUser error:', err);
    sendError(res, 'Admini silmək mümkün olmadı', 500);
  }
};
