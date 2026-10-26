import { IMAGE_CONFIG, IMAGE_LOADER, ImageConfig, ImageLoaderConfig } from '@angular/common';
import { Provider } from '@angular/core';

const AMAZON_CDN = 'https://m.media-amazon.com/images/I/';

/** Tiny image (≈1 KB) that NgOptimizedImage shows blurred while the real one downloads. */
export const PLACEHOLDER_WIDTH = 30;

/**
 * NgOptimizedImage loader for Amazon's image CDN. The CDN resizes on the fly: `_AC_SX{width}_`
 * returns the image scaled to that width (capped at the original size), so the browser can pick
 * the smallest file that fits from the generated `srcset`. `_FMwebp_` asks for WebP, which is
 * 30–60% smaller than the JPEG Amazon serves by default (the `.jpg` extension is just part of the key).
 *
 * A retry is requested as `<imageId>#<attempt>` (see `withAttempt`): changing `ngSrc` is the one
 * NgOptimizedImage input allowed to change after init. It becomes `?attempt=N` so the browser
 * doesn't reuse its cached failure.
 */
export function amazonImageLoader({ src, width, isPlaceholder }: ImageLoaderConfig): string {
  const [imageId, attempt] = src.split('#');
  // No width = the plain `src` fallback; a card is ~150–310 px wide, so 320 covers it.
  const size = isPlaceholder ? PLACEHOLDER_WIDTH : (width ?? 320);
  return `${AMAZON_CDN}${imageId}._AC_SX${size}_FMwebp_.jpg${attempt ? `?attempt=${attempt}` : ''}`;
}

/** The `ngSrc` for a given load attempt (0 = first try). */
export function withAttempt(imageId: string, attempt: number): string {
  return attempt > 0 ? `${imageId}#${attempt}` : imageId;
}

/**
 * Widths offered in `srcset`. Dense around card sizes (150–310 px, ×2 on high-DPI phones) so the
 * browser never has to round far up; Amazon product originals are rarely wider than ~1500 px.
 */
const IMAGE_SETTINGS: ImageConfig = {
  breakpoints: [160, 240, 280, 320, 400, 480, 640, 800, 1080, 1440],
  placeholderResolution: PLACEHOLDER_WIDTH,
};

/** Provide on the component that renders Amazon images, so the loader stays in that lazy chunk. */
export function provideAmazonImages(): Provider[] {
  return [
    { provide: IMAGE_LOADER, useValue: amazonImageLoader },
    { provide: IMAGE_CONFIG, useValue: IMAGE_SETTINGS },
  ];
}
