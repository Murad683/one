import { z } from 'zod';

// ─── Project ───────────────────────────────────

export const createProjectSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters'),
  thumbnailUrl: z.string().optional().nullable(),
  youtubeId: z.string().optional(),
  category: z.string().min(2, 'Category must be at least 2 characters').optional(),
  categoryLegacy: z.string().min(2, 'Category must be at least 2 characters').optional(),
  categoryId: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  externalUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  year: z.number().int().optional().nullable(),
  serviceTitle: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─── Package ───────────────────────────────────

export const createPackageSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters'),
  priceLabel: z
    .string({ error: 'Price label is required' })
    .min(1, 'Price label is required'),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  isPopular: z.boolean().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  youtubeUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updatePackageSchema = createPackageSchema.partial();

// ─── Service ───────────────────────────────────

export const createServiceSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters'),
  iconName: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

// ─── Team Member ───────────────────────────────

export const createTeamMemberSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  role: z
    .string({ error: 'Role is required' })
    .min(2, 'Role must be at least 2 characters'),
  avatarUrl: z.string().optional().nullable(),
  linkedinUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  twitterUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial();
