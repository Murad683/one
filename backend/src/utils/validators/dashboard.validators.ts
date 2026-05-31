import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(200, 'Subject cannot exceed 200 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters').max(5000, 'Body cannot exceed 5000 characters'),
});

export const submitFeedbackSchema = z.object({
  clientFeedback: z.string().min(1, 'Feedback cannot be empty').max(5000, 'Feedback cannot exceed 5000 characters'),
});
