import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAX_GET_RETRIES, httpRetryInterceptor } from './http-retry.interceptor';

describe('httpRetryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpRetryInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('retries a GET that fails with 503, then succeeds', async () => {
    let result: unknown;
    http.get('/api/gallery').subscribe((r) => (result = r));

    backend.expectOne('/api/gallery').flush(null, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/gallery').flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it(`gives up after ${MAX_GET_RETRIES} retries`, async () => {
    let failed = false;
    http.get('/api/gallery').subscribe({ error: () => (failed = true) });

    backend.expectOne('/api/gallery').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await vi.advanceTimersByTimeAsync(500);
    backend.expectOne('/api/gallery').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await vi.advanceTimersByTimeAsync(1000);
    backend.expectOne('/api/gallery').flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(failed).toBe(true);
  });

  it('does not retry client errors or writes', () => {
    let failures = 0;
    http.get('/api/gallery?category=Toys').subscribe({ error: () => failures++ });
    backend.expectOne('/api/gallery?category=Toys').flush(null, { status: 400, statusText: 'Bad Request' });

    http.post('/api/users', {}).subscribe({ error: () => failures++ });
    backend.expectOne('/api/users').flush(null, { status: 503, statusText: 'Unavailable' });

    expect(failures).toBe(2);
  });
});
