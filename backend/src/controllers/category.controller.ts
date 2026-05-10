import { Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../utils/prisma';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  const category = await prisma.category.create({ data: { name, slug } });
  res.status(201).json(category);
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { name } = req.body;
  const data: { name?: string; slug?: string } = {};

  if (name) {
    data.name = name;
    data.slug = slugify(name, { lower: true, strict: true });
  }

  const category = await prisma.category.update({ where: { id }, data });
  res.json(category);
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await prisma.project.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });
  res.json({ success: true });
};
