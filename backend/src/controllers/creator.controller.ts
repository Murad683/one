import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

const MAX_HIGHLIGHTS = 20;

// GET /api/v1/creator/clients
// Minimal client list for creators: no email, package or payment data.
export const getCreatorClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        igHighlights: true,
        shareToken: true,
        shareTokenExpiresAt: true,
      },
    });

    sendSuccess(
      res,
      clients.map(({ shareToken, ...c }) => ({
        ...c,
        shareUrl: shareToken ? `${process.env.FRONTEND_URL}/share/${shareToken}` : null,
      }))
    );
  } catch (err) {
    console.error('getCreatorClients error:', err);
    sendError(res, 'Failed to fetch clients', 500);
  }
};

// PATCH /api/v1/creator/clients/:id/highlights
// Updates only igHighlights — never any other account field.
export const updateClientHighlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { igHighlights } = req.body;

    const valid =
      Array.isArray(igHighlights) &&
      igHighlights.length <= MAX_HIGHLIGHTS &&
      igHighlights.every(
        (h: any) => h && typeof h.title === 'string' && typeof h.imageUrl === 'string'
      );
    if (!valid) {
      sendError(res, `igHighlights must be an array of up to ${MAX_HIGHLIGHTS} { title, imageUrl } items`, 400);
      return;
    }

    const client = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!client || client.role !== 'CLIENT') {
      sendError(res, 'Client not found', 404);
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        igHighlights: igHighlights.map((h: any) => ({ title: h.title, imageUrl: h.imageUrl })),
      },
      select: { id: true, name: true, igHighlights: true },
    });

    sendSuccess(res, updated);
  } catch (err) {
    console.error('updateClientHighlights error:', err);
    sendError(res, 'Failed to update highlights', 500);
  }
};

// Ensures :id refers to a CLIENT before reusing shared user controllers.
export const requireClientTarget = async (req: Request, res: Response, next: () => void): Promise<void> => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id as string }, select: { role: true } });
    if (!target || target.role !== 'CLIENT') {
      sendError(res, 'Client not found', 404);
      return;
    }
    next();
  } catch (err) {
    console.error('requireClientTarget error:', err);
    sendError(res, 'Internal Server Error', 500);
  }
};
