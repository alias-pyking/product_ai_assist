
export interface Message {
  role: Role;
  content: string;
  type?: string;
  items?: any[]
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  messages: Message[];
  prompt: string;
  temperature: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  prompt: string;
  temperature: number;
}
