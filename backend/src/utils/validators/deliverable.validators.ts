import { z } from 'zod';

export const createDeliverableSchema = z.object({
  clientId: z.string({ error: 'Client ID is required' }).cuid(),
  title: z.string({ error: 'Title is required' }).min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),
  type: z.string().max(50, 'Type cannot exceed 50 characters').optional(),
  categoryId: z.string().max(100).optional(),
  month: z
    .number({ error: 'Month is required' })
    .int()
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  year: z
    .number({ error: 'Year is required' })
    .int()
    .min(2020, 'Year must be between 2020 and 2100')
    .max(2100, 'Year must be between 2020 and 2100'),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'ARCHIVED']).optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
});

export const updateDeliverableStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'ARCHIVED'], {
    error: 'Status must be one of PENDING, PROCESSING, READY, ARCHIVED',
  }),
});

export const updateDeliverableSchema = createDeliverableSchema.partial();
