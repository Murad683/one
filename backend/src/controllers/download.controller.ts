import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendError, sendSuccess } from '../utils/response.util';
import { CLIENT_VISIBLE_WHERE } from '../utils/retention';
import { signZipTicket, verifyZipTicket } from '../utils/jwt.util';
import { canModifyDeliverable } from './deliverable.controller';
import {
  ZipError,
  acquireZipSlot,
  assertZipAllowed,
  planHighlightZip,
  planZip,
  releaseZipSlot,
  streamZip,
} from '../services/deliverableZip';

const zipSelect = { id: true, title: true, files: true, originalUrl: true, createdById: true } as const;
const highlightZipSelect = {
  id: true,
  title: true,
  userId: true,
  coverItemId: true,
  items: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true, originalUrl: true } },
} as const;
const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CREATOR'];

const sendZipError = (res: Response, err: unknown): void => {
  if (err instanceof ZipError) {
    sendError(res, err.message, err.status);
    return;
  }
  console.error('[Zip] error:', err);
  sendError(res, 'ZIP hazırlana bilmədi. Yenidən cəhd edin.', 500);
};

// POST /api/v1/dashboard/deliverables/:id/zip-ticket — a client asks to download one of their own deliverables.
export const createClientZipTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: String(req.params.id), clientId: userId, status: 'READY', ...CLIENT_VISIBLE_WHERE },
      select: zipSelect,
    });
    if (!deliverable) { sendError(res, 'Tapılmadı', 404); return; }
    const plan = planZip(deliverable);
    await assertZipAllowed(plan.entries, plan.needsSizeCheck);
    sendSuccess(res, { ticket: signZipTicket({ deliverableId: deliverable.id, userId, kind: 'client' }) });
  } catch (err) {
    sendZipError(res, err);
  }
};

// POST /api/v1/deliverables/:id/zip-ticket — admins any deliverable, creators only their own (canModifyDeliverable).
export const createStaffZipTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }
    const deliverable = await prisma.deliverable.findUnique({ where: { id: String(req.params.id) }, select: zipSelect });
    if (!deliverable) { sendError(res, 'Tapılmadı', 404); return; }
    if (!canModifyDeliverable(req.user, deliverable)) { sendError(res, 'Forbidden', 403); return; }
    const plan = planZip(deliverable);
    await assertZipAllowed(plan.entries, plan.needsSizeCheck);
    sendSuccess(res, { ticket: signZipTicket({ deliverableId: deliverable.id, userId, kind: 'staff' }) });
  } catch (err) {
    sendZipError(res, err);
  }
};

// POST /api/v1/dashboard/highlights/:id/zip-ticket — a client asks for all images of one of their own highlights.
export const createClientHighlightZipTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }
    const highlight = await prisma.highlight.findFirst({
      where: { id: String(req.params.id), userId },
      select: highlightZipSelect,
    });
    if (!highlight) { sendError(res, 'Tapılmadı', 404); return; }
    const plan = planHighlightZip(highlight);
    await assertZipAllowed(plan.entries, plan.needsSizeCheck);
    sendSuccess(res, { ticket: signZipTicket({ highlightId: highlight.id, userId, kind: 'client' }) });
  } catch (err) {
    sendZipError(res, err);
  }
};

// POST /api/v1/highlights/:id/zip-ticket — admins and creators (they manage every client's highlights).
export const createStaffHighlightZipTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized', 401); return; }
    const highlight = await prisma.highlight.findUnique({ where: { id: String(req.params.id) }, select: highlightZipSelect });
    if (!highlight) { sendError(res, 'Tapılmadı', 404); return; }
    const plan = planHighlightZip(highlight);
    await assertZipAllowed(plan.entries, plan.needsSizeCheck);
    sendSuccess(res, { ticket: signZipTicket({ highlightId: highlight.id, userId, kind: 'staff' }) });
  } catch (err) {
    sendZipError(res, err);
  }
};

/** The highlight a ticket opens, re-checked against the database; null when it is no longer allowed. */
const highlightForTicket = async (highlightId: string, userId: string, kind: 'client' | 'staff') => {
  if (kind === 'client') {
    return prisma.highlight.findFirst({
      where: { id: highlightId, userId, user: { isActive: true } },
      select: highlightZipSelect,
    });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (!user || !user.isActive || !STAFF_ROLES.includes(user.role)) return null;
  return prisma.highlight.findUnique({ where: { id: highlightId }, select: highlightZipSelect });
};

// GET /api/v1/downloads/:ticket — the browser navigates here. The ticket is the only credential (60 s,
// one deliverable); access is re-checked against the database before anything is sent.
export const downloadZip = async (req: Request, res: Response): Promise<void> => {
  let slotHeld = false;
  try {
    let ticket;
    try {
      ticket = verifyZipTicket(String(req.params.ticket));
    } catch {
      sendError(res, 'Yükləmə linkinin vaxtı bitib. Yenidən cəhd edin.', 401);
      return;
    }

    if (ticket.highlightId) {
      const highlight = await highlightForTicket(ticket.highlightId, ticket.userId, ticket.kind);
      if (!highlight) { sendError(res, 'Tapılmadı', 404); return; }
      const plan = planHighlightZip(highlight);
      await assertZipAllowed(plan.entries, false);
      if (!acquireZipSlot()) {
        sendError(res, 'Server məşğuldur, bir neçə saniyədən sonra yenidən cəhd edin.', 429);
        return;
      }
      slotHeld = true;
      await streamZip(res, plan.base, plan.entries);
      return;
    }
    if (!ticket.deliverableId) { sendError(res, 'Tapılmadı', 404); return; }

    let deliverable;
    if (ticket.kind === 'client') {
      deliverable = await prisma.deliverable.findFirst({
        where: {
          id: ticket.deliverableId,
          clientId: ticket.userId,
          status: 'READY',
          ...CLIENT_VISIBLE_WHERE,
          client: { isActive: true },
        },
        select: zipSelect,
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { id: true, role: true, isActive: true } });
      const found = await prisma.deliverable.findUnique({ where: { id: ticket.deliverableId }, select: zipSelect });
      deliverable = user && user.isActive && found && canModifyDeliverable(user, found) ? found : null;
    }
    if (!deliverable) { sendError(res, 'Tapılmadı', 404); return; }

    const { base, entries } = planZip(deliverable);
    // Sizes were checked when the ticket was issued (where needed); streamZip also enforces the byte limit.
    await assertZipAllowed(entries, false);

    if (!acquireZipSlot()) {
      sendError(res, 'Server məşğuldur, bir neçə saniyədən sonra yenidən cəhd edin.', 429);
      return;
    }
    slotHeld = true;
    await streamZip(res, base, entries);
  } catch (err) {
    if (!res.headersSent) sendZipError(res, err);
    else res.destroy();
  } finally {
    if (slotHeld) releaseZipSlot();
  }
};
