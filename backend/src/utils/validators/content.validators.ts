import { z } from 'zod';

// ─── Project ───────────────────────────────────

export const createProjectSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  thumbnailUrl: z.string().max(500).optional().nullable(),
  youtubeId: z.string().max(50).optional(),
  category: z.string().min(2, 'Category must be at least 2 characters').max(100).optional(),
  categoryLegacy: z.string().min(2, 'Category must be at least 2 characters').max(100).optional(),
  categoryId: z.string().max(100).optional().nullable(),
  isFeatured: z.boolean().optional(),
  externalUrl: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  year: z.number().int().optional().nullable(),
  serviceTitle: z.string().max(200).optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─── Package ───────────────────────────────────

export const createPackageSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  priceLabel: z
    .string({ error: 'Price label is required' })
    .min(1, 'Price label is required')
    .max(50, 'Price label cannot exceed 50 characters'),
  features: z.array(z.string().max(500)).min(1, 'At least one feature is required'),
  isPopular: z.boolean().optional(),
  buttonText: z.string().max(100).optional(),
  buttonUrl: z.union([z.string().url().max(500), z.string().max(500)]).optional(),
  youtubeUrl: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updatePackageSchema = createPackageSchema.partial();

// ─── Service ───────────────────────────────────

export const createServiceSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ error: 'Description is required' })
    .min(2, 'Description must be at least 2 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  iconName: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

// ─── Team Member ───────────────────────────────

export const createTeamMemberSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  role: z
    .string({ error: 'Role is required' })
    .min(2, 'Role must be at least 2 characters')
    .max(100, 'Role cannot exceed 100 characters'),
  avatarUrl: z.string().max(500).optional().nullable(),
  linkedinUrl: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  twitterUrl: z.union([z.string().url().max(500), z.literal('')]).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial();
