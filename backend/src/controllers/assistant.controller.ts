import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../utils/response.util';
import {
  askAssistant,
  isAssistantConfigured,
  AssistantBusyError,
  AssistantUnavailableError,
} from '../services/assistant.service';

const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 6000;

export const assistantChatSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
        })
      )
      .min(1)
      .max(12),
  })
  // zod 4 still runs refinements when the array checks above already failed
  // (e.g. an empty array), so these must not assume a non-empty list.
  .refine((v) => v.messages[v.messages.length - 1]?.role === 'user', {
    message: 'Last message must be from the user',
    path: ['messages'],
  })
  .refine((v) => v.messages.reduce((n, m) => n + m.content.length, 0) <= MAX_TOTAL_CHARS, {
    message: 'Conversation is too long',
    path: ['messages'],
  });

export const chat = async (req: Request, res: Response): Promise<void> => {
  if (!isAssistantConfigured()) {
    sendError(res, 'Köməkçi hazırda aktiv deyil', 503);
    return;
  }

  try {
    const { messages } = req.body as z.infer<typeof assistantChatSchema>;
    const reply = await askAssistant(req.user!.role, messages);
    sendSuccess(res, { reply });
  } catch (err) {
    if (err instanceof AssistantBusyError) {
      sendError(res, 'Köməkçi hazırda məşğuldur, bir az sonra yenidən cəhd edin', 429);
      return;
    }
    // Never answer with 502/504: Cloudflare replaces those origin responses with
    // its own error page (no CORS headers), which the browser reports as a CORS
    // failure and hides our message.
    if (err instanceof AssistantUnavailableError) {
      sendError(res, 'Köməkçi hazırda yüklüdür, bir az sonra yenidən cəhd edin', 503);
      return;
    }
    sendError(res, 'Köməkçi cavab verə bilmədi, bir az sonra yenidən cəhd edin', 500);
  }
};
