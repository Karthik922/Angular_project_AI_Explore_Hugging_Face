import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse, User, UserPayload } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  list(page: number, limit: number): Observable<PageResponse<User>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PageResponse<User>>(this.baseUrl, { params });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(payload: UserPayload): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<UserPayload>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ deleted: true; id: number }> {
    return this.http.delete<{ deleted: true; id: number }>(`${this.baseUrl}/${id}`);
  }
}

/** Turns a Nest error response ({ message: string | string[] }) into readable text. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0 || err.status === 504) {
      return 'Cannot reach the API. Is the Nest server running on port 3000?';
    }
    const message = err.error?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    return `Request failed (${err.status})`;
  }
  return 'Something went wrong';
}
