import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Message } from 'primeng/message';
import { describeHttpError } from '../core/http-errors';
import { OnlineStatus } from '../core/online-status';
import { provideAmazonImages } from './amazon-image-loader';
import { GalleryCard } from './gallery-card/gallery-card';
import {
  GALLERY_CATEGORIES,
  GalleryCategory,
  GalleryResponse,
  SIMULATIONS,
  Simulation,
  isGalleryCategory,
} from './gallery.model';
import { Lightbox } from './lightbox/lightbox';

/** Give up on the API after this long; the user gets a "server is slow" error with a Retry button. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Show "taking longer than usual" after this long. */
const SLOW_REQUEST_MS = 3_000;
/** Cards above the fold on a wide screen: loaded eagerly with high priority (the LCP candidates). */
const PRIORITY_IMAGES = 4;

@Component({
  selector: 'app-gallery',
  imports: [ButtonModule, Message, GalleryCard, Lightbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The image loader is provided here, not app-wide, so it ships in this lazy chunk.
  providers: [provideAmazonImages()],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  private readonly router = inject(Router);
  protected readonly online = inject(OnlineStatus).online;
  protected readonly isDev = isDevMode();
  protected readonly simulations = SIMULATIONS;
  protected readonly priorityImages = PRIORITY_IMAGES;
  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

  /** `?category=` and `?simulate=` query params, bound by withComponentInputBinding(). */
  readonly category = input<string>();
  readonly simulate = input<string>();

  protected readonly activeCategory = computed<GalleryCategory | undefined>(() =>
    isGalleryCategory(this.category()) ? this.category() as GalleryCategory : undefined,
  );
  protected readonly activeSimulation = computed<Simulation | undefined>(() => {
    const value = this.simulate();
    return this.isDev && (SIMULATIONS as readonly string[]).includes(value ?? '') ? (value as Simulation) : undefined;
  });

  /**
   * Refetches automatically whenever the category (or dev simulation) changes.
   * index.html preloads the first request; keep its URL in sync with this one.
   */
  protected readonly gallery = httpResource<GalleryResponse>(() => {
    const category = this.activeCategory();
    const simulate = this.activeSimulation();
    return {
      url: '/api/gallery',
      params: { ...(category && { category }), ...(simulate && { simulate }) },
      timeout: REQUEST_TIMEOUT_MS,
    };
  });

  /** Last successful response: stays on screen (dimmed) while the next category loads. */
  private readonly lastResponse = linkedSignal<GalleryResponse | undefined, GalleryResponse | undefined>({
    source: () => (this.gallery.hasValue() ? this.gallery.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly items = computed(() => this.lastResponse()?.data);
  protected readonly categories = computed(() => {
    const counts = new Map(this.lastResponse()?.meta.categories.map((c) => [c.name, c.count]));
    return GALLERY_CATEGORIES.map((name) => ({ name, count: counts.get(name) }));
  });
  protected readonly totalCount = computed(() =>
    this.lastResponse()?.meta.categories.reduce((sum, c) => sum + c.count, 0),
  );

  protected readonly view = computed<'skeleton' | 'error' | 'empty' | 'grid'>(() => {
    if (this.gallery.status() === 'error') return 'error';
    const items = this.items();
    if (!items) return 'skeleton';
    return items.length ? 'grid' : 'empty';
  });
  protected readonly errorInfo = computed(() =>
    describeHttpError(this.gallery.error(), this.online(), REQUEST_TIMEOUT_MS),
  );

  protected readonly slowRequest = signal(false);
  protected readonly lightboxIndex = signal(0);
  protected readonly lightboxOpen = signal(false);

  constructor() {
    // "Taking longer than usual" hint for slow responses.
    effect((onCleanup) => {
      this.slowRequest.set(false);
      if (!this.gallery.isLoading()) return;
      const timer = setTimeout(() => this.slowRequest.set(true), SLOW_REQUEST_MS);
      onCleanup(() => clearTimeout(timer));
    });

    // Back online after a failure: try again without making the user click.
    effect(() => {
      if (this.online() && untracked(() => this.gallery.status()) === 'error') this.gallery.reload();
    });
  }

  protected selectCategory(category: GalleryCategory | undefined): void {
    this.router.navigate([], { queryParams: { category: category ?? null }, queryParamsHandling: 'merge' });
  }

  protected selectSimulation(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.router.navigate([], { queryParams: { simulate: value || null }, queryParamsHandling: 'merge' });
  }

  protected openLightbox(index: number): void {
    this.lightboxIndex.set(index);
    this.lightboxOpen.set(true);
  }
}
