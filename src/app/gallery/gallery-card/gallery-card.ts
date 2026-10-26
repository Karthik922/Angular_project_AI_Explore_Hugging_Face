import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GalleryImage } from '../gallery.model';
import { SmartImage } from '../smart-image/smart-image';

@Component({
  selector: 'app-gallery-card',
  imports: [SmartImage, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <!--
      sizes = real card width as a share of the window, net of the 256 px sidebar (from md), padding
      and gaps: 4 cols ≈ 16–19vw, 3 cols ≈ 19–25vw, 2 cols on phones ≈ 45vw. Lazy images use the
      measured width anyway ("auto"); this matters for the priority ones, which load before layout.
      No blur placeholder: its background image downloads for every card at once, even far below
      the fold, and competes with the LCP image. The shimmer covers loading instead.
    -->
    <article
      class="relative flex h-full flex-col overflow-hidden rounded-xl border border-surface bg-surface-0 transition-shadow hover:shadow-md has-[.open:focus-visible]:ring-2 has-[.open:focus-visible]:ring-primary dark:bg-surface-900"
    >
      <app-smart-image
        class="aspect-square bg-white"
        [src]="item().imageId"
        [alt]="item().alt"
        [priority]="priority()"
        [placeholder]="false"
        sizes="(min-width: 1280px) 19vw, (min-width: 768px) 24vw, 45vw"
      />
      <div class="flex flex-1 flex-col gap-1 p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-muted-color">{{ item().category }}</span>
        <h3 class="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{{ item().title }}</h3>
        <p class="m-0 mt-auto text-base font-bold text-primary">
          {{ item().price | currency: 'INR' : 'symbol' : '1.0-0' }}
        </p>
      </div>
      <!-- Stretched button: the whole card opens the lightbox; the image Retry button sits above it. -->
      <button type="button" class="open absolute inset-0 z-[1] cursor-zoom-in border-0 bg-transparent outline-none" (click)="open.emit()">
        <span class="sr-only">View {{ item().title }}</span>
      </button>
    </article>
  `,
})
export class GalleryCard {
  readonly item = input.required<GalleryImage>();
  readonly priority = input(false);
  readonly open = output<void>();
}
