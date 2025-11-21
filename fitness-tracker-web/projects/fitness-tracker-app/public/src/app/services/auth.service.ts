import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environment';
import { AuthSessionService } from './auth-session.service';

interface LoginResult {
  token: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginUrl = this.resolveLoginUrl();

  constructor(private http: HttpClient, private session: AuthSessionService) {}

  login(email: string, password: string): Observable<LoginResult> {
    const trimmedEmail = email.trim();
    const payload = {
      email: trimmedEmail,
      username: trimmedEmail,
      password,
    };

    const devBypass = environment.devAuthBypass;
    if (devBypass?.enabled && trimmedEmail === devBypass.email) {
      const username = devBypass.username ?? trimmedEmail;
      const token = devBypass.token ?? 'dev-bypass-token';
      this.persistSession(token, username, trimmedEmail);
      return of({ token, username });
    }

    return this.http.post<any>(this.loginUrl, payload, { observe: 'response' }).pipe(
      map((response) => {
        const token = this.extractToken(response);
        if (!token) {
          throw new Error('Kein JWT-Token im Login-Response gefunden.');
        }
        const username =
          response.body?.username ?? response.body?.name ?? response.body?.user ?? trimmedEmail;
        this.persistSession(token, username, trimmedEmail);
        return { token, username };
      })
    );
  }

  getToken(): string | null {
    return this.session.getToken();
  }

  getUsername(): string | null {
    return this.session.getUsername();
  }

  getEmail(): string | null {
    return this.session.getEmail();
  }

  isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  logout(): void {
    this.session.clear();
  }

  private extractToken(response: HttpResponse<any>): string | null {
    const header = response.headers.get('Authorization') ?? response.headers.get('authorization');
    if (header?.toLowerCase().startsWith('bearer ')) {
      return header.substring(7).trim();
    }

    const body = response.body ?? {};
    return body.token ?? body.access_token ?? body.jwt ?? body.jwtToken ?? null;
  }

  private persistSession(token: string, username: string, email: string): void {
    this.session.setSession(token, username, email);
  }

  private resolveLoginUrl(): string {
    const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
    if (!base) {
      return '/login';
    }
    if (base.endsWith('/api/v1')) {
      return `${base.replace(/\/api\/v1$/, '')}/login`;
    }
    return `${base}/login`;
  }
}
