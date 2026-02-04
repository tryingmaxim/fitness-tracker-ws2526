import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environment';
import { AuthSessionService } from './auth-session.service';

interface LoginResult {
  token: string;
  username: string;
}

interface MeResponse {
  username?: string;
  email?: string;
}

const API_PATHS = {
  ME: '/users/me',
} as const;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private readonly sessionService: AuthSessionService,
    private readonly httpClient: HttpClient
  ) {}

  login(email: string, password: string): Observable<LoginResult> {
    const normalizedEmail = this.normalizeEmail(email);

    this.sessionService.setBasicAuthSession(normalizedEmail, password, normalizedEmail);

    return this.httpClient.get<MeResponse>(this.buildMeUrl()).pipe(
      map((me) => this.toLoginResult(me, normalizedEmail)),
      catchError((error) => {
        this.sessionService.clear();
        return throwError(() => error);
      })
    );
  }

  isLoggedIn(): boolean {
    return this.sessionService.isLoggedIn();
  }

  logout(): void {
    this.sessionService.clear();
  }

  getUsername(): string | null {
    return this.sessionService.getUsername();
  }

  getEmail(): string | null {
    return this.sessionService.getEmail();
  }

  private toLoginResult(me: MeResponse | null | undefined, fallbackEmail: string): LoginResult {
    return {
      token: this.sessionService.getAuthHeader() ?? '',
      username: this.resolveUsername(me, fallbackEmail),
    };
  }

  private buildMeUrl(): string {
    return `${environment.apiBaseUrl}${API_PATHS.ME}`;
  }

  private resolveUsername(me: MeResponse | null | undefined, fallbackEmail: string): string {
    return this.normalizeText(me?.username ?? me?.email ?? fallbackEmail);
  }

  private normalizeEmail(value: string | null | undefined): string {
    return this.normalizeText(value).toLowerCase();
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
