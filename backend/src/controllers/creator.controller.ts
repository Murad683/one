import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { parseLegacy } from '../services/highlight.service';

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
        _count: { select: { highlights: true } },
      },
    });

    sendSuccess(
      res,
      clients.map(({ shareToken, _count, ...c }) => ({
        ...c,
        shareUrl: shareToken ? `${process.env.FRONTEND_URL}/share/${shareToken}` : null,
        // Rows, or the old JSON form until the client's highlights are first edited.
        highlightCount: _count.highlights > 0 ? _count.highlights : parseLegacy(c.igHighlights).length,
      }))
    );
  } catch (err) {
    console.error('getCreatorClients error:', err);
    sendError(res, 'Failed to fetch clients', 500);
  }
};

// PATCH /api/v1/creator/clients/:id/highlights
// Closed: highlights live in their own tables (/api/v1/highlights). Answers 410 so a tab still running
// the old admin bundle gets a clear message instead of silently writing the old JSON form.
export const updateClientHighlights = async (_req: Request, res: Response): Promise<void> => {
  sendError(res, 'Köhnə highlight sistemi bağlanıb. Səhifəni yeniləyin.', 410);
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
