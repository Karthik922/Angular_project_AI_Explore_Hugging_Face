import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, linkedSignal, signal } from '@angular/core';

type ImageState = 'loading' | 'loaded' | 'error';

/** Silent retries before showing the fallback; covers one-off network hiccups. */
const AUTO_RETRIES = 1;
/** After this long without the image, tell the user the network is slow. */
const SLOW_AFTER_MS = 6000;

/**
 * NgOptimizedImage in `fill` mode plus everything around it: a shimmer and blurred placeholder while
 * loading, a "slow network" hint, one silent retry, and a fallback with a Retry button when the image
 * can't be loaded. The host must be given a size (e.g. `aspect-square` or a fixed height).
 */
@Component({
  selector: 'app-smart-image',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block overflow-hidden',
    '[attr.aria-busy]': "state() === 'loading'",
  },
  template: `
    @if (state() !== 'error') {
      <!-- Keyed so a retry or a priority change creates a fresh <img>: NgOptimizedImage inputs are fixed after init. -->
      @for (key of imgKey(); track key) {
        <img
          [ngSrc]="src()"
          [alt]="alt()"
          fill
          [sizes]="sizes()"
          [priority]="priority()"
          [placeholder]="placeholder()"
          [loaderParams]="{ attempt: attempt() }"
          class="object-contain"
          (load)="state.set('loaded')"
          (error)="onError()"
        />
      }
      @if (state() === 'loading') {
        <div class="shimmer" aria-hidden="true"></div>
        @if (slow()) {
          <span class="slow-badge" role="status"><i class="pi pi-hourglass"></i> Slow network…</span>
        }
      }
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt() + ' (image unavailable)'">
        <i class="pi pi-image text-3xl"></i>
        <span class="text-sm font-medium">Image unavailable</span>
        <button type="button" class="retry" (click)="retry($event)">
          <i class="pi pi-refresh"></i> Retry
        </button>
      </div>
    }
  `,
  styles: `
    .shimmer {
      position: absolute;
      inset: 0;
      background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.45) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
      pointer-events: none;
    }
    @keyframes shimmer {
      from { background-position: 150% 0; }
      to { background-position: -50% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .shimmer { animation: none; }
    }
    .slow-badge {
      position: absolute;
      left: 0.5rem;
      bottom: 0.5rem;
      display: inline-flex;
      gap: 0.35rem;
      align-items: center;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      color: #fff;
      background: rgb(15 23 42 / 0.75);
    }
    .fallback {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      color: var(--p-text-muted-color);
      background: var(--p-content-hover-background);
    }
    .retry {
      position: relative;
      z-index: 2;
      display: inline-flex;
      gap: 0.35rem;
      align-items: center;
      margin-top: 0.25rem;
      padding: 0.3rem 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 6px;
      font: inherit;
      font-size: 0.8rem;
      color: var(--p-text-color);
      background: var(--p-content-background);
      cursor: pointer;
    }
    .retry:hover { border-color: var(--p-primary-color); color: var(--p-primary-color); }
    .retry:focus-visible { outline: 2px solid var(--p-primary-color); outline-offset: 2px; }
  `,
})
export class SmartImage {
  /** Image id passed to the configured IMAGE_LOADER. */
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  /**
   * Rendered width hint for srcset selection, e.g. `(min-width: 768px) 30vw, 50vw`.
   * Responsive (vw) values only: NgOptimizedImage rejects px here when it generates the srcset.
   */
  readonly sizes = input('100vw');
  /** Set for above-the-fold images (the LCP candidate): eager load with high fetch priority. */
  readonly priority = input(false);
  /** Blurred low-res preview while loading. Angular recommends it only for images under 1000 px. */
  readonly placeholder = input(true);

  /** Reset whenever a different image is shown (e.g. the next photo in the lightbox). */
  protected readonly attempt = linkedSignal({ source: this.src, computation: () => 0 });
  protected readonly state = linkedSignal<string, ImageState>({ source: this.src, computation: () => 'loading' });
  protected readonly slow = signal(false);
  protected readonly imgKey = computed(() => [`${this.src()}|${this.attempt()}|${this.priority()}`]);

  constructor() {
    effect((onCleanup) => {
      this.slow.set(false);
      if (this.state() !== 'loading') return;
      const timer = setTimeout(() => this.slow.set(true), SLOW_AFTER_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected onError(): void {
    if (this.attempt() < AUTO_RETRIES) {
      this.attempt.update((n) => n + 1);
    } else {
      this.state.set('error');
    }
  }

  protected retry(event: Event): void {
    event.stopPropagation(); // don't also trigger a click handler on the surrounding card
    this.attempt.update((n) => n + 1);
    this.state.set('loading');
  }
}
