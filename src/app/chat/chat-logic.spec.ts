import { parseSse, toEvents } from './chat-api';
import { toSegments } from './markdown';
import { toApiMessages } from './chat.store';
import { ChatMessage } from './chat.model';

describe('parseSse', () => {
  it('returns complete data lines and keeps a partial line for the next chunk', () => {
    const first = parseSse('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"de');
    expect(first.payloads).toHaveLength(1);
    expect(first.rest).toBe('data: {"choices":[{"de');

    const second = parseSse(first.rest + 'lta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n');
    expect(second.payloads).toHaveLength(1);
    expect(second.done).toBe(true);
  });
});

describe('toEvents', () => {
  it('maps deltas, finish reason and usage', () => {
    expect(toEvents({ choices: [{ delta: { content: 'Hi' } }] })).toEqual([{ type: 'delta', text: 'Hi' }]);
    expect(toEvents({ choices: [{ delta: {}, finish_reason: 'length' }] })).toEqual([{ type: 'finish', finishReason: 'length' }]);
    expect(
      toEvents({ choices: [], usage: { prompt_tokens: 26, completion_tokens: 7 }, timings: { predicted_per_second: 41.258 } }),
    ).toEqual([{ type: 'usage', stats: { promptTokens: 26, completionTokens: 7, tokensPerSecond: 41.3 } }]);
  });
});

describe('toSegments', () => {
  it('splits text and fenced code', () => {
    const segments = toSegments('Use this:\n\n```js\nconst add = (a, b) => a + b;\n```\n\nDone.');
    expect(segments.map((s) => s.kind)).toEqual(['html', 'code', 'html']);
    expect(segments[1]).toEqual({ kind: 'code', lang: 'js', code: 'const add = (a, b) => a + b;' });
    expect((segments[0] as { html: string }).html).toContain('<p>Use this:</p>');
  });

  it('treats an unclosed fence (mid-stream) as code', () => {
    const segments = toSegments('Here:\n\n```ts\nconst x =');
    expect(segments.at(-1)).toMatchObject({ kind: 'code', lang: 'ts' });
  });

  it('keeps code as plain text (no HTML rendering inside code)', () => {
    const [code] = toSegments('```html\n<script>alert(1)</script>\n```');
    expect(code).toEqual({ kind: 'code', lang: 'html', code: '<script>alert(1)</script>' });
  });
});

describe('toApiMessages', () => {
  const msg = (role: ChatMessage['role'], content: string, status?: ChatMessage['status']): ChatMessage => ({
    id: content,
    role,
    content,
    createdAt: 0,
    status,
  });

  it('adds the system prompt and drops failed or empty replies', () => {
    const result = toApiMessages('Be brief.', [
      msg('user', 'q1'),
      msg('assistant', 'oops', 'error'),
      msg('user', 'q2'),
      msg('assistant', '', 'stopped'),
      msg('user', 'q3'),
    ]);
    expect(result).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'q1' },
      { role: 'user', content: 'q2' },
      { role: 'user', content: 'q3' },
    ]);
  });

  it('keeps a stopped reply that has text', () => {
    const result = toApiMessages('', [msg('user', 'q'), msg('assistant', 'partial answer', 'stopped')]);
    expect(result).toEqual([{ role: 'user', content: 'q' }, { role: 'assistant', content: 'partial answer' }]);
  });
});
