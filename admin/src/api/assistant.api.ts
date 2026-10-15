import client from './client';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const askAssistant = async (messages: AssistantMessage[]): Promise<string> => {
  const res = await client.post('/assistant', { messages }, { timeout: 40000 });
  return res.data.data.reply as string;
};
