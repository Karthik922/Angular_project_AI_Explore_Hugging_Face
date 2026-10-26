import { PLACEHOLDER_WIDTH, amazonImageLoader, withAttempt } from './amazon-image-loader';

describe('amazonImageLoader', () => {
  it('builds a CDN URL resized to the requested width', () => {
    expect(amazonImageLoader({ src: '711l4y8aNlL', width: 480 })).toBe(
      'https://m.media-amazon.com/images/I/711l4y8aNlL._AC_SX480_FMwebp_.jpg',
    );
  });

  it('uses the tiny placeholder width for blurred previews', () => {
    expect(amazonImageLoader({ src: '711l4y8aNlL', width: 800, isPlaceholder: true })).toContain(
      `._AC_SX${PLACEHOLDER_WIDTH}_FMwebp_.jpg`,
    );
  });

  it('adds a cache-busting query only on retries', () => {
    expect(withAttempt('711l4y8aNlL', 0)).toBe('711l4y8aNlL');
    expect(amazonImageLoader({ src: withAttempt('711l4y8aNlL', 0), width: 200 })).not.toContain('?');
    expect(amazonImageLoader({ src: withAttempt('711l4y8aNlL', 2), width: 200 })).toBe(
      'https://m.media-amazon.com/images/I/711l4y8aNlL._AC_SX200_FMwebp_.jpg?attempt=2',
    );
  });

  it('keeps ids that contain + or - intact', () => {
    expect(amazonImageLoader({ src: '71g-a2u+--L', width: 320 })).toContain('/71g-a2u+--L._AC_SX320_FMwebp_.jpg');
  });
});
