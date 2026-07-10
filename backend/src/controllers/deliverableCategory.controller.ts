import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.deliverableCategory.findMany({
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, categories);
  } catch (err) {
    console.error('DeliverableCategory getCategories error:', err);
    sendError(res, 'Failed to fetch categories', 500);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, isVideo } = req.body;
    if (!name) {
      sendError(res, 'Name is required', 400);
      return;
    }

    const category = await prisma.deliverableCategory.create({
      data: { name, isVideo: isVideo === true },
    });
    sendSuccess(res, category, 201);
  } catch (err) {
    console.error('DeliverableCategory createCategory error:', err);
    sendError(res, 'Failed to create category', 500);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const category = await prisma.deliverableCategory.update({
      where: { id },
      data: { name },
    });
    sendSuccess(res, category);
  } catch (err) {
    console.error('DeliverableCategory updateCategory error:', err);
    sendError(res, 'Failed to update category', 500);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.deliverableCategory.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error('DeliverableCategory deleteCategory error:', err);
    sendError(res, 'Failed to delete category', 500);
  }
};
