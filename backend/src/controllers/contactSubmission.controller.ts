import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /api/v1/contact-submissions
export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const [submissions, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactSubmission.count(),
  ]);
  res.json({ submissions, total, page, limit });
};

// POST /api/v1/contact-submissions
export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  const { name, email, companyName, serviceId, serviceName, message } = req.body;
  const submission = await prisma.contactSubmission.create({
    data: { name, email, companyName, serviceId, serviceName, message },
  });
  res.status(201).json(submission);
};

// PATCH /api/v1/contact-submissions/:id
export const updateSubmission = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const submission = await prisma.contactSubmission.update({
    where: { id },
    data: { isRead: req.body.isRead },
  });
  res.json(submission);
};

// DELETE /api/v1/contact-submissions/:id
export const deleteSubmission = async (req: Request, res: Response): Promise<void> => {
  await prisma.contactSubmission.delete({ where: { id: req.params.id as string } });
  res.json({ success: true });
};

// GET /api/v1/contact-submissions/unread-count
export const getUnreadCount = async (_req: Request, res: Response): Promise<void> => {
  const count = await prisma.contactSubmission.count({ where: { isRead: false } });
  res.json({ count });
};
