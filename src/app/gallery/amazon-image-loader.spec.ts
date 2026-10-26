import { PLACEHOLDER_WIDTH, amazonImageLoader } from './amazon-image-loader';

describe('amazonImageLoader', () => {
  it('builds a CDN URL resized to the requested width', () => {
    expect(amazonImageLoader({ src: '711l4y8aNlL', width: 480 })).toBe(
      'https://m.media-amazon.com/images/I/711l4y8aNlL._AC_SX480_.jpg',
    );
  });

  it('uses the tiny placeholder width for blurred previews', () => {
    expect(amazonImageLoader({ src: '711l4y8aNlL', width: 800, isPlaceholder: true })).toContain(
      `._AC_SX${PLACEHOLDER_WIDTH}_.jpg`,
    );
  });

  it('adds a cache-busting query only on retries', () => {
    expect(amazonImageLoader({ src: 'x', width: 200, loaderParams: { attempt: 0 } })).not.toContain('?');
    expect(amazonImageLoader({ src: 'x', width: 200, loaderParams: { attempt: 2 } })).toMatch(/\?attempt=2$/);
  });
});
