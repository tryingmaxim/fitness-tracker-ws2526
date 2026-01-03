import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  constructor(
  private session: AuthSessionService,
  private http: HttpClient
) {}

login(email: string, password: string): Observable<LoginResult> {
  const trimmedEmail = (email ?? '').trim().toLowerCase();

  // DEV BYPASS
  const devBypass = environment.devAuthBypass;
  if (devBypass?.enabled && trimmedEmail === devBypass.email) {
    const username = devBypass.username ?? trimmedEmail;
    this.session.setSessionBasic(trimmedEmail, password || 'dev', username);

    return of({
      token: devBypass.token ?? 'dev-basic',
      username,
    });
  }

  // 1️⃣ Basic Header setzen
  this.session.setSessionBasic(trimmedEmail, password, trimmedEmail);

  // 2️⃣ Backend MUSS bestätigen
  return this.http.get<any>(`${environment.apiBaseUrl}/users/me`).pipe(
    map((me) => ({
      token: this.session.getAuthHeader()!,
      username: me?.username || me?.email || trimmedEmail,
    })),
    catchError((err) => {
      // Login fehlgeschlagen → Session löschen
      this.session.clear();
      return throwError(() => err);
    })
  );
}

  isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  logout(): void {
    this.session.clear();
  }

  getUsername(): string | null {
    return this.session.getUsername();
  }

  getEmail(): string | null {
    return this.session.getEmail();
  }
}
