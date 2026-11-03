import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';
import { ChatMessage } from '../chat.model';
import { toSegments } from '../markdown';
import { ToolActivityView } from '../tool-activity/tool-activity';
import { A2uiSurfaceView } from '../a2ui/a2ui-surface';

/** One chat bubble: Markdown with copyable code blocks, streaming cursor, stats and actions. */
@Component({
  selector: 'app-chat-message',
  imports: [ToolActivityView, A2uiSurfaceView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Markdown arrives as [innerHTML], which emulated encapsulation can't style; selectors are prefixed instead.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'flex flex-col gap-1', '[class.items-end]': "message().role === 'user'" },
  styleUrl: './chat-message.scss',
  template: `
    @let msg = message();
    @if (msg.role === 'user') {
      @if (editing()) {
        <div class="flex w-full max-w-[85%] flex-col gap-2">
          <textarea
            [id]="'edit-' + msg.id"
            class="cm-input min-h-24 w-full resize-y rounded-lg border border-surface bg-surface-0 p-3 text-sm text-color dark:bg-surface-900"
            [value]="msg.content"
            #editBox
            (keydown.escape)="editing.set(false)"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button type="button" class="cm-btn" (click)="editing.set(false)">Cancel</button>
            <button type="button" class="cm-btn cm-btn-primary" [disabled]="busy()" (click)="saveEdit(editBox.value)">Save &amp; send</button>
          </div>
        </div>
      } @else {
        <div class="cm-user rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">{{ msg.content }}</div>
        <div class="cm-actions">
          <button type="button" class="cm-icon" title="Copy" aria-label="Copy message" (click)="copy(msg.content)"><i class="pi pi-copy"></i></button>
          @if (!busy()) {
            <button type="button" class="cm-icon" title="Edit" aria-label="Edit and resend" (click)="editing.set(true)"><i class="pi pi-pencil"></i></button>
          }
        </div>
      }
    } @else {
      <div class="flex w-full gap-3">
        <span class="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast" aria-hidden="true">
          <i class="pi pi-sparkles text-xs"></i>
        </span>
        <div class="min-w-0 flex-1">
          @if (msg.trimmed) {
            <p class="cm-note"><i class="pi pi-info-circle"></i> {{ msg.trimmed }} older {{ msg.trimmed === 1 ? 'message was' : 'messages were' }} left out to fit the model's memory.</p>
          }
          @for (tool of msg.tools ?? []; track tool.id) {
            <!-- On the A2UI page the surface shows the data, so the raw tool result stays folded. -->
            <app-tool-activity [activity]="tool" [startOpen]="!uiMode() && !msg.ui?.length" />
          }
          @if (msg.ui?.length) {
            <app-a2ui-surface [messages]="msg.ui!" (ask)="ask.emit($event)" />
          } @else if (msg.status === 'streaming' && !msg.content) {
            @if (uiMode() && msg.tools?.length) {
              <p class="cm-note" role="status"><i class="pi pi-spin pi-spinner"></i> Building the view…</p>
            } @else {
              <div class="cm-thinking" role="status" aria-label="Model is thinking"><span></span><span></span><span></span></div>
            }
          } @else {
            <div class="chat-md" [class.cm-streaming]="msg.status === 'streaming'">
              @for (seg of segments(); track $index) {
                @if (seg.kind === 'html') {
                  <div [innerHTML]="seg.html"></div>
                } @else {
                  <div class="cm-code">
                    <div class="cm-code-head">
                      <span>{{ seg.lang }}</span>
                      <button type="button" (click)="copy(seg.code, $index)">
                        <i class="pi" [class.pi-check]="copiedIndex() === $index" [class.pi-copy]="copiedIndex() !== $index"></i>
                        {{ copiedIndex() === $index ? 'Copied' : 'Copy' }}
                      </button>
                    </div>
                    <pre><code>{{ seg.code }}</code></pre>
                  </div>
                }
              }
            </div>
          }

          @switch (msg.status) {
            @case ('error') {
              <div class="cm-error" role="alert">
                <i class="pi pi-exclamation-triangle"></i> {{ msg.error }}
                @if (isLast()) { <button type="button" class="cm-btn" (click)="regenerate.emit()">Try again</button> }
              </div>
            }
            @case ('stopped') {
              <p class="cm-note"><i class="pi pi-stop-circle"></i> Stopped.</p>
            }
          }
          @if (msg.finishReason === 'length' && msg.status === 'done') {
            <div class="cm-note">
              <i class="pi pi-exclamation-circle"></i> Reply cut off at the length limit.
              @if (isLast()) { <button type="button" class="cm-btn" (click)="continueReply.emit()">Continue</button> }
            </div>
          }

          @if (msg.status !== 'streaming') {
            <div class="cm-actions">
              <button type="button" class="cm-icon" title="Copy" aria-label="Copy reply" (click)="copy(msg.content)"><i class="pi pi-copy"></i></button>
              @if (isLast() && !busy()) {
                <button type="button" class="cm-icon" title="Regenerate" aria-label="Regenerate reply" (click)="regenerate.emit()"><i class="pi pi-refresh"></i></button>
              }
              @if (msg.stats) {
                <span class="cm-stats">{{ msg.stats.completionTokens }} tokens · {{ msg.stats.tokensPerSecond }} tok/s</span>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ChatMessageView {
  readonly message = input.required<ChatMessage>();
  /** Last message in the conversation: only it can be regenerated or continued. */
  readonly isLast = input(false);
  /** A reply is being generated somewhere in this chat. */
  readonly busy = input(false);
  /** A2UI page: the reply is drawn as a UI surface, so tool results start folded. */
  readonly uiMode = input(false);

  readonly regenerate = output<void>();
  readonly continueReply = output<void>();
  readonly edit = output<string>();
  /** A2UI page: a follow-up button in the reply's UI was clicked. */
  readonly ask = output<string>();

  protected readonly editing = signal(false);
  protected readonly copiedIndex = signal<number | null>(null);
  protected readonly segments = computed(() => toSegments(this.message().content));

  protected saveEdit(text: string): void {
    this.editing.set(false);
    if (text.trim() && text.trim() !== this.message().content) this.edit.emit(text);
  }

  protected async copy(text: string, index: number | null = null): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedIndex.set(index);
      if (index !== null) setTimeout(() => this.copiedIndex.set(null), 1500);
    } catch {
      // clipboard blocked (e.g. insecure context): nothing else to do
    }
  }
}
