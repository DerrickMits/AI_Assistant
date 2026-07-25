import type { ModelId } from "@/lib/site";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequestBody {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  model: ModelId;
}
