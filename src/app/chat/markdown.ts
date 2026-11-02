import { marked, type Token } from 'marked';

export type Segment = { kind: 'html'; html: string } | { kind: 'code'; code: string; lang: string };

/**
 * Splits a Markdown reply into rendered HTML and code blocks. Code blocks are returned as plain
 * text so the template can render them with a Copy button and Angular interpolation (no HTML).
 * Works on partial text while streaming: an unclosed ``` fence is treated as code until it ends.
 * The HTML is bound with [innerHTML], which Angular sanitizes (scripts, event handlers removed).
 */
export function toSegments(markdown: string): Segment[] {
  const tokens = marked.lexer(markdown, { gfm: true, breaks: true });
  const segments: Segment[] = [];
  let group: Token[] = [];

  const flush = () => {
    if (group.length === 0) return;
    segments.push({ kind: 'html', html: marked.parser(group, { gfm: true, breaks: true }) });
    group = [];
  };

  for (const token of tokens) {
    if (token.type === 'code') {
      flush();
      segments.push({ kind: 'code', code: token.text, lang: token.lang || 'text' });
    } else {
      group.push(token);
    }
  }
  flush();
  return segments;
}
