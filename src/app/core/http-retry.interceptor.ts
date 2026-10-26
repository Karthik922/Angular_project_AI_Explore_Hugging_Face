import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';
import { isTimeoutError } from './http-errors';

export const MAX_GET_RETRIES = 2;

/** Network failures and server-side errors that are often gone a moment later. */
const RETRYABLE_STATUS = new Set([0, 408, 429, 500, 502, 503, 504]);

/**
 * Retries failed GET requests on transient errors with exponential backoff (0.5 s, then 1 s).
 * Writes are never retried (they may not be safe to repeat), and neither are timeouts:
 * a server that is already slow only gets slower if every client asks again.
 */
export const httpRetryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);
  return next(req).pipe(
    retry({
      count: MAX_GET_RETRIES,
      delay: (error: unknown, attempt) =>
        isRetryable(error) ? timer(500 * 2 ** (attempt - 1)) : throwError(() => error),
    }),
  );
};

function isRetryable(error: unknown): boolean {
  return error instanceof HttpErrorResponse && !isTimeoutError(error) && RETRYABLE_STATUS.has(error.status);
}
