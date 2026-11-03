import { InjectionToken, Provider } from '@angular/core';
import { ChatSettings, DEFAULT_SETTINGS } from './chat.model';
import { ChatStore } from './chat.store';

/** What differs between the plain chat and the database chat; the UI and store are shared. */
export interface ChatConfig {
  /** chat = plain model · data = database tools, text answers · a2ui = database tools, answers drawn as a UI. */
  mode: 'chat' | 'data' | 'a2ui';
  /** Shown when the conversation has no title yet. */
  title: string;
  /** Backend endpoint that streams the reply. */
  endpoint: string;
  /** localStorage prefix, so each chat keeps its own conversations and settings. */
  storageKey: string;
  defaultSettings: ChatSettings;
  emptyTitle: string;
  emptyHint: string;
  placeholder: string;
  suggestions: string[];
}

export const CHAT_CONFIG = new InjectionToken<ChatConfig>('CHAT_CONFIG');

export const GENERAL_CHAT: ChatConfig = {
  mode: 'chat',
  title: 'Chat',
  endpoint: '/api/chat/completions',
  storageKey: 'chat',
  defaultSettings: DEFAULT_SETTINGS,
  emptyTitle: 'How can I help?',
  emptyHint: "Ask a coding question. Replies stream in as they're written.",
  placeholder: 'Message the model…',
  suggestions: [
    'Explain the difference between signal(), computed() and effect() in Angular',
    'Write a NestJS controller with CRUD endpoints for products',
    'Find the bug: for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))',
    'Convert this SQL to a Sequelize query: SELECT * FROM users WHERE age > 30 ORDER BY name',
  ],
};

export const DATA_CHAT: ChatConfig = {
  mode: 'data',
  title: 'Data Chat',
  endpoint: '/api/chat/agent',
  storageKey: 'data-chat',
  // The backend adds the tool instructions; this prompt is extra guidance on top.
  defaultSettings: { systemPrompt: '', temperature: 0.3, maxTokens: 256 },
  emptyTitle: 'Ask about your users',
  emptyHint: 'The assistant reads the users table through database tools (read-only).',
  placeholder: 'Ask about users, e.g. "Show all users"…',
  suggestions: ['Show all users', 'How many users are there?', 'Find users named Alice', 'Who is the oldest user?'],
};

export const A2UI_CHAT: ChatConfig = {
  mode: 'a2ui',
  title: 'A2UI',
  endpoint: '/api/chat/a2ui',
  storageKey: 'a2ui-chat',
  defaultSettings: { systemPrompt: '', temperature: 0.3, maxTokens: 256 },
  emptyTitle: 'Answers as a live UI',
  emptyHint: 'The assistant reads the users table and replies with an A2UI screen: tables, cards, stats and follow-up buttons.',
  placeholder: 'Ask about users, e.g. "Show all users"…',
  suggestions: ['Show all users', 'Show me kumar email id', 'Who is the oldest user?', 'How many users are there?'],
};

/** Providers for one chat page: its config plus its own store instance. */
export function provideChat(config: ChatConfig): Provider[] {
  return [{ provide: CHAT_CONFIG, useValue: config }, ChatStore];
}
