import { z } from 'zod';

export const createContactSubmissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email format').max(100, 'Email cannot exceed 100 characters'),
  companyName: z.string().max(100, 'Company name cannot exceed 100 characters').optional().nullable(),
  serviceId: z.string().max(100).optional().nullable(),
  serviceName: z.string().max(100).optional().nullable(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message cannot exceed 5000 characters'),
});
