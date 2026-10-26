import { IMAGE_CONFIG, IMAGE_LOADER, ImageConfig, ImageLoaderConfig } from '@angular/common';
import { Provider } from '@angular/core';

const AMAZON_CDN = 'https://m.media-amazon.com/images/I/';

/** Tiny image (≈1 KB) that NgOptimizedImage shows blurred while the real one downloads. */
export const PLACEHOLDER_WIDTH = 30;

/**
 * NgOptimizedImage loader for Amazon's image CDN. The CDN resizes on the fly: `_AC_SX{width}_`
 * returns the image scaled to that width (capped at the original size), so the browser can pick
 * the smallest file that fits from the generated `srcset`.
 *
 * `loaderParams.attempt` adds a query string so a retry after a failed load bypasses the cached error.
 */
export function amazonImageLoader({ src, width, isPlaceholder, loaderParams }: ImageLoaderConfig): string {
  const size = isPlaceholder ? PLACEHOLDER_WIDTH : (width ?? 480);
  const attempt = Number(loaderParams?.['attempt'] ?? 0);
  return `${AMAZON_CDN}${src}._AC_SX${size}_.jpg${attempt > 0 ? `?attempt=${attempt}` : ''}`;
}

/** Widths offered in `srcset`; Amazon product originals are rarely wider than ~1500 px. */
const IMAGE_SETTINGS: ImageConfig = {
  breakpoints: [160, 240, 320, 480, 640, 800, 1080, 1440],
  placeholderResolution: PLACEHOLDER_WIDTH,
};

/** Provide on the component that renders Amazon images, so the loader stays in that lazy chunk. */
export function provideAmazonImages(): Provider[] {
  return [
    { provide: IMAGE_LOADER, useValue: amazonImageLoader },
    { provide: IMAGE_CONFIG, useValue: IMAGE_SETTINGS },
  ];
}
