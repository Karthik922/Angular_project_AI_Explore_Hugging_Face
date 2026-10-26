import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** The browser's online/offline state as a signal. */
@Injectable({ providedIn: 'root' })
export class OnlineStatus {
  private readonly state = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly online = this.state.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;
    const goOnline = () => this.state.set(true);
    const goOffline = () => this.state.set(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    });
  }
}
