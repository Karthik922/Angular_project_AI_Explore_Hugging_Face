import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChatMessageView } from './chat-message/chat-message';
import { CHAT_CONFIG } from './chat.config';
import { ChatStatus } from './chat.model';
import { ChatStore } from './chat.store';

@Component({
  selector: 'app-chat',
  imports: [ButtonModule, ChatMessageView, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  host: { '(document:keydown.escape)': 'store.stop()' },
})
export class Chat {
  protected readonly store = inject(ChatStore);
  protected readonly config = inject(CHAT_CONFIG);

  /** Data Chat and A2UI: which database tools the backend can use (from the Python MCP server). */
  protected readonly tools = httpResource<{ connected: boolean; tools: { name: string; description: string }[] }>(() =>
    this.config.mode !== 'chat' ? '/api/chat/tools' : undefined,
  );
  protected readonly toolNames = computed(() => (this.tools.hasValue() ? this.tools.value().tools.map((t) => t.name).join(', ') : ''));

  /** Is the model server up? Shown in the header; reload() re-checks. */
  protected readonly status = httpResource<ChatStatus>(() => '/api/chat/status');
  protected readonly online = computed(() => (this.status.hasValue() ? this.status.value().status === 'online' : null));
  protected readonly modelName = computed(() => {
    const model = this.status.hasValue() ? this.status.value().model : null;
    return model?.replace(/\.gguf$/i, '') ?? 'Model';
  });

  protected readonly draft = signal('');
  protected readonly showSettings = signal(false);
  protected readonly showHistory = signal(false);
  protected readonly canSend = computed(() => this.draft().trim().length > 0 && !this.store.generating());

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');
  /** Follow new tokens only while the user is at the bottom; scrolling up to read pauses it. */
  private readonly stickToBottom = signal(true);

  constructor() {
    effect(() => {
      this.store.messages(); // re-run on every new message / streamed chunk
      if (!untracked(this.stickToBottom)) return;
      requestAnimationFrame(() => {
        const el = this.scroller()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
    // Switching conversations jumps to its latest message.
    effect(() => {
      this.store.activeId();
      this.stickToBottom.set(true);
    });
  }

  protected send(): void {
    if (!this.canSend()) return;
    this.store.send(this.draft());
    this.draft.set('');
    this.stickToBottom.set(true);
  }

  protected useSuggestion(text: string): void {
    this.draft.set(text);
    this.input()?.nativeElement.focus();
  }

  protected onComposerKey(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter adds a line; ignore Enter while an IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  private lastScrollTop = 0;

  /** Stop following only when the user scrolls up; resume once they are back near the bottom. */
  protected onScroll(el: HTMLElement): void {
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) this.stickToBottom.set(true);
    else if (el.scrollTop < this.lastScrollTop - 4) this.stickToBottom.set(false);
    this.lastScrollTop = el.scrollTop;
  }

  protected scrollToBottom(): void {
    this.stickToBottom.set(true);
    const el = this.scroller()?.nativeElement;
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  protected newChat(): void {
    this.store.newChat();
    this.showHistory.set(false);
    this.input()?.nativeElement.focus();
  }

  protected open(id: string): void {
    this.store.select(id);
    this.showHistory.set(false);
  }

  protected rename(id: string, current: string): void {
    const title = prompt('Rename chat', current);
    if (title !== null) this.store.rename(id, title);
  }

  protected remove(id: string, title: string): void {
    if (confirm(`Delete "${title}"?`)) this.store.remove(id);
  }

  protected clearAll(): void {
    if (confirm('Delete all chats? This cannot be undone.')) this.store.clearAll();
  }

  protected numberFrom(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected textFrom(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  protected readonly atBottom = this.stickToBottom.asReadonly();
}
