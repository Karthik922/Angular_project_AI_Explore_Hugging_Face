import type { A2uiMessage } from './a2ui/a2ui.model';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatStats {
  promptTokens: number;
  completionTokens: number;
  tokensPerSecond: number;
}

/** One tool the assistant used while answering (Data Chat). */
export interface ToolActivity {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  /** Structured result from the MCP tool (exact database rows). */
  data?: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** Assistant replies only. */
  status?: 'streaming' | 'done' | 'stopped' | 'error';
  error?: string;
  /** 'length' = the reply hit the max-tokens limit and was cut off. */
  finishReason?: 'stop' | 'length' | null;
  stats?: ChatStats;
  /** Older messages the server left out so this request fit the model's context window. */
  trimmed?: number;
  /** Tools used for this reply, in order. */
  tools?: ToolActivity[];
  /** A2UI page only: the messages describing this reply's UI surface, in arrival order. */
  ui?: A2uiMessage[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatSettings {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  systemPrompt:
    'You are a helpful coding assistant. Answer concisely. Use Markdown, and put code in fenced code blocks with the language name.',
  temperature: 0.7,
  maxTokens: 512,
};

/** GET /api/chat/status */
export interface ChatStatus {
  status: 'online' | 'offline';
  model: string | null;
  contextSize: number;
}

/** Message format of the OpenAI-compatible chat-completions API. */
export interface ApiMessage {
  role: ChatRole;
  content: string;
}
