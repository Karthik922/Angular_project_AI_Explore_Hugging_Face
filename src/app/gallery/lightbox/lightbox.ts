import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { GalleryImage } from '../gallery.model';
import { SmartImage } from '../smart-image/smart-image';

/**
 * Full-size image viewer on the native <dialog>: focus trap, Esc to close and the backdrop come
 * from the browser. Arrow keys / buttons move between images. Loaded with @defer on first open.
 */
@Component({
  selector: 'app-lightbox',
  imports: [SmartImage, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.arrowleft)': 'step(-1)',
    '(document:keydown.arrowright)': 'step(1)',
  },
  template: `
    @let item = current();
    <dialog
      #dialog
      class="m-auto h-[min(90vh,52rem)] open:flex w-[min(94vw,64rem)] max-w-none flex-col overflow-hidden rounded-xl border border-surface bg-surface-0 p-0 text-color backdrop:bg-black/70 dark:bg-surface-900"
      aria-labelledby="lightbox-title"
      (close)="closed.emit()"
      (click)="closeOnBackdrop($event)"
    >
      <header class="flex items-center gap-3 border-b border-surface px-4 py-3">
        <div class="min-w-0 flex-1">
          <h2 id="lightbox-title" class="m-0 truncate text-base font-semibold">{{ item.title }}</h2>
          <p class="m-0 text-sm text-muted-color">
            {{ item.category }} · {{ item.price | currency: 'INR' : 'symbol' : '1.0-0' }}
          </p>
        </div>
        <span class="text-sm tabular-nums text-muted-color" aria-live="polite">{{ index() + 1 }} / {{ items().length }}</span>
        <button type="button" class="icon-btn" aria-label="Close" (click)="dialog.close()">
          <i class="pi pi-times"></i>
        </button>
      </header>

      <div class="relative flex min-h-0 flex-1 items-center gap-2 bg-white p-2">
        <button type="button" class="icon-btn nav" aria-label="Previous image" [disabled]="items().length < 2" (click)="step(-1)">
          <i class="pi pi-chevron-left"></i>
        </button>
        <app-smart-image
          class="h-full min-w-0 flex-1"
          [src]="item.imageId"
          [alt]="item.alt"
          sizes="(min-width: 1024px) 70vw, 94vw"
          [placeholder]="false"
        />
        <button type="button" class="icon-btn nav" aria-label="Next image" [disabled]="items().length < 2" (click)="step(1)">
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    </dialog>
  `,
  styles: `
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      flex-shrink: 0;
      border: 1px solid var(--p-content-border-color);
      border-radius: 999px;
      color: var(--p-text-color);
      background: var(--p-content-background);
      cursor: pointer;
    }
    .icon-btn:hover:not(:disabled) { color: var(--p-primary-color); border-color: var(--p-primary-color); }
    .icon-btn:disabled { opacity: 0.4; cursor: default; }
    .icon-btn:focus-visible { outline: 2px solid var(--p-primary-color); outline-offset: 2px; }
    .nav { position: relative; z-index: 2; }
  `,
})
export class Lightbox {
  readonly items = input.required<GalleryImage[]>();
  /** Two-way bound: `[(index)]="..."`. */
  readonly index = model.required<number>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly current = computed(() => this.items()[this.index()] ?? this.items()[0]);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected step(delta: number): void {
    const count = this.items().length;
    if (count < 2) return;
    this.index.update((i) => (i + delta + count) % count);
  }

  /** A click on the dialog element itself (not its content) is a click on the backdrop. */
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }
}
