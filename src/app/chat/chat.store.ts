import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CHAT_CONFIG } from './chat.config';
import { ChatApi, ChatApiError } from './chat-api';
import { ApiMessage, ChatMessage, ChatSettings, Conversation, ToolActivity } from './chat.model';

const MAX_SAVED_CONVERSATIONS = 50;

/**
 * All chat state as signals. Provided per chat route (see chat.routes.ts) with a CHAT_CONFIG, so
 * the plain chat and the data chat share this code but keep separate conversations. Route
 * providers live as long as the app, so a reply keeps streaming while you visit other pages.
 * Conversations + settings are saved in this browser (localStorage).
 */
@Injectable()
export class ChatStore {
  private readonly api = inject(ChatApi);
  private readonly config = inject(CHAT_CONFIG);
  private readonly conversationsKey = `${this.config.storageKey}.conversations.v1`;
  private readonly settingsKey = `${this.config.storageKey}.settings.v1`;

  readonly conversations = signal<Conversation[]>(load(this.conversationsKey, [] as Conversation[]).map(recoverInterrupted));
  readonly activeId = signal<string | null>(this.conversations()[0]?.id ?? null);
  readonly settings = signal<ChatSettings>({ ...this.config.defaultSettings, ...load(this.settingsKey, {}) });

  readonly active = computed(() => this.conversations().find((c) => c.id === this.activeId()) ?? null);
  readonly messages = computed(() => this.active()?.messages ?? []);
  /** Newest first, for the sidebar. */
  readonly history = computed(() => [...this.conversations()].sort((a, b) => b.updatedAt - a.updatedAt));

  private readonly abortController = signal<AbortController | null>(null);
  readonly generating = computed(() => this.abortController() !== null);

  constructor() {
    // Save after each change, but not on every streamed chunk: while generating, this effect only
    // tracks `generating`, and it saves once when the reply finishes.
    effect(() => {
      if (this.generating()) return;
      save(this.conversationsKey, this.history().slice(0, MAX_SAVED_CONVERSATIONS));
    });
    effect(() => save(this.settingsKey, this.settings()));
  }

  // ---------- conversations ----------

  newChat(): void {
    if (this.active()?.messages.length === 0) return; // already on an empty chat
    const now = Date.now();
    const chat: Conversation = { id: crypto.randomUUID(), title: 'New chat', messages: [], createdAt: now, updatedAt: now };
    this.conversations.update((list) => [chat, ...list]);
    this.activeId.set(chat.id);
  }

  select(id: string): void {
    this.activeId.set(id);
  }

  rename(id: string, title: string): void {
    const clean = title.trim().slice(0, 80);
    if (clean) this.patchConversation(id, (c) => ({ ...c, title: clean }));
  }

  remove(id: string): void {
    if (this.generating() && this.activeId() === id) this.stop();
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    if (this.activeId() === id) this.activeId.set(this.history()[0]?.id ?? null);
  }

  clearAll(): void {
    this.stop();
    this.conversations.set([]);
    this.activeId.set(null);
  }

  updateSettings(patch: Partial<ChatSettings>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
  }

  resetSettings(): void {
    this.settings.set(this.config.defaultSettings);
  }

  // ---------- messaging ----------

  send(text: string): void {
    const content = text.trim();
    if (!content || this.generating()) return;
    if (!this.active()) this.newChat();
    const id = this.activeId()!;
    this.patchConversation(id, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFrom(content) : c.title,
      messages: [...c.messages, newMessage('user', content)],
    }));
    void this.reply(id);
  }

  /** Throw away the last reply and ask again. */
  regenerate(): void {
    const chat = this.active();
    if (!chat || this.generating()) return;
    const last = chat.messages.at(-1);
    if (last?.role !== 'assistant') return;
    this.patchConversation(chat.id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));
    void this.reply(chat.id);
  }

  /** Change an earlier question: everything after it is discarded and a new reply is generated. */
  editAndResend(messageId: string, text: string): void {
    const chat = this.active();
    const content = text.trim();
    if (!chat || !content || this.generating()) return;
    const index = chat.messages.findIndex((m) => m.id === messageId);
    if (index < 0 || chat.messages[index].role !== 'user') return;
    this.patchConversation(chat.id, (c) => ({
      ...c,
      messages: [...c.messages.slice(0, index), { ...c.messages[index], content }],
    }));
    void this.reply(chat.id);
  }

  /** Ask the model to carry on after a reply was cut off by the max-tokens limit. */
  continueReply(): void {
    this.send('Continue exactly where you stopped.');
  }

  stop(): void {
    this.abortController()?.abort();
  }

  private async reply(chatId: string): Promise<void> {
    const chat = this.conversations().find((c) => c.id === chatId);
    if (!chat) return;
    const settings = this.settings();
    const request = {
      messages: toApiMessages(settings.systemPrompt, chat.messages),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    };

    const assistant: ChatMessage = { ...newMessage('assistant', ''), status: 'streaming' };
    this.patchConversation(chatId, (c) => ({ ...c, messages: [...c.messages, assistant] }));
    const update = (patch: (m: ChatMessage) => ChatMessage) => this.patchMessage(chatId, assistant.id, patch);

    const controller = new AbortController();
    this.abortController.set(controller);

    // Tokens arrive ~40/s; batch them so the view updates at most once per frame.
    let pending = '';
    let frame: number | null = null;
    const flush = () => {
      frame = null;
      if (!pending) return;
      const text = pending;
      pending = '';
      update((m) => ({ ...m, content: m.content + text }));
    };

    try {
      for await (const event of this.api.stream(this.config.endpoint, request, controller.signal)) {
        switch (event.type) {
          case 'meta':
            if (event.trimmed > 0) update((m) => ({ ...m, trimmed: event.trimmed }));
            break;
          case 'delta':
            pending += event.text;
            frame ??= requestAnimationFrame(flush);
            break;
          case 'finish':
            update((m) => ({ ...m, finishReason: event.finishReason }));
            break;
          case 'usage':
            update((m) => ({ ...m, stats: event.stats }));
            break;
          case 'tool_call': {
            const activity: ToolActivity = { id: event.id, name: event.name, arguments: event.arguments, status: 'running' };
            update((m) => ({ ...m, tools: [...(m.tools ?? []), activity] }));
            break;
          }
          case 'tool_result':
            update((m) => ({
              ...m,
              tools: m.tools?.map((tool) =>
                tool.id === event.id
                  ? { ...tool, status: event.ok ? 'done' : 'error', data: event.data, error: event.error }
                  : tool,
              ),
            }));
            break;
          case 'a2ui':
            update((m) => ({ ...m, ui: [...(m.ui ?? []), event.message] }));
            break;
          case 'error':
            throw new ChatApiError(event.message, 0);
        }
      }
      flush();
      update((m) => ({ ...m, status: 'done' }));
    } catch (err) {
      flush();
      if (controller.signal.aborted) {
        update((m) => ({ ...m, status: 'stopped' }));
      } else {
        const message = err instanceof ChatApiError ? err.message : 'The reply was interrupted. Try again.';
        update((m) => ({ ...m, status: 'error', error: message }));
      }
    } finally {
      if (frame !== null) cancelAnimationFrame(frame);
      this.abortController.set(null);
    }
  }

  // ---------- immutable updates ----------

  private patchConversation(id: string, patch: (c: Conversation) => Conversation): void {
    this.conversations.update((list) => list.map((c) => (c.id === id ? { ...patch(c), updatedAt: Date.now() } : c)));
  }

  private patchMessage(chatId: string, messageId: string, patch: (m: ChatMessage) => ChatMessage): void {
    this.conversations.update((list) =>
      list.map((c) =>
        c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? patch(m) : m)) } : c,
      ),
    );
  }
}

/** What the model sees: system prompt + finished messages (failed or empty replies are left out). */
export function toApiMessages(systemPrompt: string, messages: ChatMessage[]): ApiMessage[] {
  const history = messages
    .filter((m) => m.role === 'user' || (m.content.trim() !== '' && m.status !== 'error'))
    .map((m) => ({ role: m.role, content: m.content }));
  return systemPrompt.trim() ? [{ role: 'system', content: systemPrompt.trim() }, ...history] : history;
}

function newMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: Date.now() };
}

function titleFrom(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 48 ? `${oneLine.slice(0, 47)}…` : oneLine;
}

/** A reply that was streaming when the page closed can't resume: mark it stopped. */
function recoverInterrupted(chat: Conversation): Conversation {
  return {
    ...chat,
    messages: chat.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' } : m)),
  };
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: chat still works for this session
  }
}
