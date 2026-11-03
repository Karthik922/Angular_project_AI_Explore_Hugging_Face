import { Injectable } from '@angular/core';
import type { A2uiMessage } from './a2ui/a2ui.model';
import { ApiMessage, ChatStats } from './chat.model';

export type StreamEvent =
  | { type: 'meta'; trimmed: number }
  | { type: 'delta'; text: string }
  | { type: 'finish'; finishReason: 'stop' | 'length' | null }
  | { type: 'usage'; stats: ChatStats }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; id: string; ok: boolean; data: unknown; error?: string }
  | { type: 'a2ui'; message: A2uiMessage }
  | { type: 'error'; message: string };

export interface CompletionRequest {
  messages: ApiMessage[];
  temperature: number;
  max_tokens: number;
}

export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface ToolEventJson {
  type: 'call' | 'result';
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
  ok?: boolean;
  data?: unknown;
  error?: string;
}

interface ChunkJson {
  /** Data Chat only: a tool step, sent by the backend between model chunks. */
  tool_event?: ToolEventJson;
  /** A2UI page only: one message describing the reply's UI surface. */
  a2ui?: A2uiMessage;
  /** Sent when the reply fails after streaming started. */
  error?: { message?: string };
  choices?: { delta?: { content?: string | null }; finish_reason?: 'stop' | 'length' | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
  timings?: { predicted_per_second?: number };
}

/**
 * Splits buffered Server-Sent-Event text into complete `data:` payloads.
 * Returns the parsed payloads, whether `[DONE]` arrived, and the unfinished tail to keep.
 */
export function parseSse(buffer: string): { payloads: ChunkJson[]; done: boolean; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? ''; // last line may be incomplete
  const payloads: ChunkJson[] = [];
  let done = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      done = true;
      continue;
    }
    try {
      payloads.push(JSON.parse(data) as ChunkJson);
    } catch {
      // ignore a malformed chunk rather than failing the whole reply
    }
  }
  return { payloads, done, rest };
}

/** Turns one parsed chunk into app events. */
export function toEvents(chunk: ChunkJson): StreamEvent[] {
  const events: StreamEvent[] = [];
  if (chunk.error) events.push({ type: 'error', message: chunk.error.message ?? 'The reply was interrupted.' });
  const tool = chunk.tool_event;
  if (tool?.type === 'call') events.push({ type: 'tool_call', id: tool.id, name: tool.name, arguments: tool.arguments ?? {} });
  if (tool?.type === 'result') events.push({ type: 'tool_result', id: tool.id, ok: tool.ok ?? false, data: tool.data, error: tool.error });
  if (chunk.a2ui) events.push({ type: 'a2ui', message: chunk.a2ui });
  const choice = chunk.choices?.[0];
  if (choice?.delta?.content) events.push({ type: 'delta', text: choice.delta.content });
  if (choice?.finish_reason) events.push({ type: 'finish', finishReason: choice.finish_reason });
  if (chunk.usage) {
    events.push({
      type: 'usage',
      stats: {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        tokensPerSecond: Math.round((chunk.timings?.predicted_per_second ?? 0) * 10) / 10,
      },
    });
  }
  return events;
}

/**
 * Streams a chat completion from the NestJS backend (`/api/chat/completions` or `/api/chat/agent`).
 * Uses fetch directly: HttpClient doesn't expose a response body as a stream of chunks.
 * Abort `signal` to stop generating (the server then stops the model too).
 */
@Injectable({ providedIn: 'root' })
export class ChatApi {
  async *stream(endpoint: string, request: CompletionRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ ...request, stream: true }),
        signal,
      });
    } catch (err) {
      if (signal.aborted) throw err;
      throw new ChatApiError("Can't reach the server. Check your connection and that the backend is running.", 0);
    }

    if (!response.ok || !response.body) {
      throw new ChatApiError(await errorMessage(response), response.status);
    }

    yield { type: 'meta', trimmed: Number(response.headers.get('X-Context-Trimmed') ?? 0) };

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const parsed = parseSse(buffer);
        buffer = parsed.rest;
        for (const payload of parsed.payloads) yield* toEvents(payload);
        if (parsed.done) return;
      }
    } finally {
      reader.releaseLock();
    }
  }
}

async function errorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  if (message) return message;
  if (response.status === 502 || response.status === 504) return "Can't reach the server. Check that the backend is running.";
  return `The server returned an error (${response.status}).`;
}
