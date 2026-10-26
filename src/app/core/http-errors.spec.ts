import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError, isTimeoutError } from './http-errors';

const timeout = new HttpErrorResponse({ error: new DOMException('Request timed out', 'TimeoutError'), status: 0 });

describe('describeHttpError', () => {
  it('reports offline before anything else', () => {
    expect(describeHttpError(timeout, false, 15_000).title).toBe("You're offline");
  });

  it('recognises a request timeout', () => {
    expect(isTimeoutError(timeout)).toBe(true);
    expect(describeHttpError(timeout, true, 15_000).detail).toContain('15 seconds');
  });

  it('treats no response and gateway errors as server unreachable', () => {
    for (const status of [0, 502, 504]) {
      expect(describeHttpError(new HttpErrorResponse({ status }), true, 15_000).title).toBe("Can't reach the server");
    }
  });

  it("shows the server's own message for 503 and 4xx", () => {
    const unavailable = new HttpErrorResponse({ status: 503, error: { message: 'Down for maintenance' } });
    expect(describeHttpError(unavailable, true, 15_000).detail).toBe('Down for maintenance');
    const invalid = new HttpErrorResponse({ status: 400, error: { message: ['category must be one of …'] } });
    expect(describeHttpError(invalid, true, 15_000).detail).toBe('category must be one of …');
  });
});
