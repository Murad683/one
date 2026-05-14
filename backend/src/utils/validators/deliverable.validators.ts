import { z } from 'zod';

export const createDeliverableSchema = z.object({
  clientId: z.string({ error: 'Client ID is required' }).cuid(),
  type: z.enum(['VIDEO', 'SMM_DESIGN', 'BRANDING', 'REPORT', 'OTHER'], {
    error: 'Növ VIDEO, SMM_DESIGN, BRANDING, REPORT və ya OTHER olmalıdır',
  }),
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
  notes: z.string().optional(),
});

export const updateDeliverableStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'ARCHIVED'], {
    error: 'Status must be one of PENDING, PROCESSING, READY, ARCHIVED',
  }),
});
