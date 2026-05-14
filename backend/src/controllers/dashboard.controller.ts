import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

// ─── GET /api/v1/dashboard/overview ────────────
export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        package: {
          select: { name: true, priceLabel: true },
        },
      },
    });

    if (!user) {
      sendError(res, 'İstifadəçi tapılmadı', 404);
      return;
    }

    // Most recent payment to get nextPaymentDate
    const latestPayment = await prisma.payment.findFirst({
      where: { userId },
      orderBy: { paidAt: 'desc' },
      select: { nextPaymentDate: true },
    });

    // Count of open tickets
    const openTicketCount = await prisma.ticket.count({
      where: { userId, status: 'OPEN' },
    });

    sendSuccess(res, {
      package: user.package
        ? { name: user.package.name, price: user.package.priceLabel }
        : null,
      nextPaymentDate: latestPayment?.nextPaymentDate?.toISOString() ?? null,
      openTicketCount,
    });
  } catch (err) {
    console.error('getOverview error:', err);
    sendError(res, 'Məlumatları yükləmək mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/dashboard/deliverables ────────
export const getDeliverables = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const deliverables = await prisma.deliverable.findMany({
      where: { clientId: userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    // Serialize BigInt fileSize to string for JSON
    const serialized = deliverables.map((d) => ({
      ...d,
      fileSize: d.fileSize?.toString() ?? null,
    }));

    sendSuccess(res, serialized);
  } catch (err) {
    console.error('getDeliverables error:', err);
    sendError(res, 'Təslim edilənləri yükləmək mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/dashboard/payments ────────────
export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { paidAt: 'desc' },
    });

    sendSuccess(res, payments);
  } catch (err) {
    console.error('getPayments error:', err);
    sendError(res, 'Ödənişləri yükləmək mümkün olmadı', 500);
  }
};

// ─── POST /api/v1/dashboard/tickets ────────────
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, body } = req.body;

    if (!subject || !body) {
      sendError(res, 'Mövzu və mesaj sahələri mütləqdir.', 400);
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        userId,
        status: 'OPEN',
      },
    });

    sendSuccess(res, ticket, 201);
  } catch (err) {
    console.error('createTicket error:', err);
    sendError(res, 'Bilet yaratmaq mümkün olmadı', 500);
  }
};

// ─── GET /api/v1/dashboard/tickets ─────────────
export const getTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, tickets);
  } catch (err) {
    console.error('getTickets error:', err);
    sendError(res, 'Biletləri yükləmək mümkün olmadı', 500);
  }
};

// ─── PATCH /api/v1/dashboard/deliverables/:id/feedback
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const deliverableId = req.params.id as string;
    const { clientFeedback } = req.body;

    if (!clientFeedback || typeof clientFeedback !== 'string' || !clientFeedback.trim()) {
      sendError(res, 'Rəy mətni mütləqdir.', 400);
      return;
    }

    // Verify deliverable belongs to this user
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, clientId: userId },
    });

    if (!deliverable) {
      sendError(res, 'Çatdırılma tapılmadı', 404);
      return;
    }

    const updated = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        clientFeedback: deliverable.clientFeedback
          ? `${deliverable.clientFeedback}\n\n--- Yeni Rəy ---\n\n${clientFeedback.trim()}`
          : clientFeedback.trim(),
      },
    });

    sendSuccess(res, {
      ...updated,
      fileSize: updated.fileSize?.toString() ?? null,
    });
  } catch (err) {
    console.error('submitFeedback error:', err);
    sendError(res, 'Rəy göndərilə bilmədi', 500);
  }
};
