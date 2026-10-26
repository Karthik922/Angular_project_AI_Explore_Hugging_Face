import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorInfo {
  title: string;
  detail: string;
  icon: string;
}

/** HttpClient reports a request `timeout` as status 0 carrying the abort reason, a `TimeoutError`. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.error instanceof DOMException && error.error.name === 'TimeoutError';
}

/** Turns an HTTP failure into a message a user can act on. */
export function describeHttpError(error: unknown, online: boolean, timeoutMs: number): ErrorInfo {
  if (!online) {
    return {
      title: "You're offline",
      detail: 'Check your internet connection. This page reloads by itself when you are back online.',
      icon: 'pi pi-wifi',
    };
  }
  if (isTimeoutError(error)) {
    return {
      title: 'The server is too slow right now',
      detail: `It did not answer within ${Math.round(timeoutMs / 1000)} seconds. Try again in a moment.`,
      icon: 'pi pi-clock',
    };
  }
  if (error instanceof HttpErrorResponse) {
    // 0 = no response at all; 502/503/504 = a proxy (nginx, dev server) could not reach the API.
    if (error.status === 0 || error.status === 502 || error.status === 504) {
      return {
        title: "Can't reach the server",
        detail: 'The server may be down or restarting. We already retried automatically; try again in a moment.',
        icon: 'pi pi-server',
      };
    }
    if (error.status === 503) {
      return { title: 'Service temporarily unavailable', detail: serverMessage(error) ?? 'Try again in a moment.', icon: 'pi pi-server' };
    }
    if (error.status >= 400 && error.status < 500) {
      return { title: 'The request was rejected', detail: serverMessage(error) ?? `Error ${error.status}.`, icon: 'pi pi-ban' };
    }
  }
  return { title: 'Something went wrong', detail: 'An unexpected error occurred. Try again.', icon: 'pi pi-exclamation-triangle' };
}

function serverMessage(error: HttpErrorResponse): string | undefined {
  const message = (error.error as { message?: string | string[] } | null)?.message;
  return Array.isArray(message) ? message.join(', ') : message;
}
