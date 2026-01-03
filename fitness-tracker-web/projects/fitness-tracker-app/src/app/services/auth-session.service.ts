import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  // Statt JWT Token speichern wir für Basic Auth den Authorization Header
  private readonly authHeaderKey = 'auth_basic_header';
  private readonly usernameKey = 'username';
  private readonly emailKey = 'user_email';

  // Login Daten werden in localStorage gespeichert
  // (email wird weiter benutzt; username kann gleich email sein)
  setSessionBasic(email: string, password: string, username?: string): void {
    const trimmedEmail = (email ?? '').trim();
    const raw = `${trimmedEmail}:${password ?? ''}`;

    // btoa kann bei Sonderzeichen Probleme machen -> robust machen
    const base64 = this.toBase64Utf8(raw);
    const headerValue = `Basic ${base64}`;

    localStorage.setItem(this.authHeaderKey, headerValue);
    localStorage.setItem(this.usernameKey, (username ?? trimmedEmail).trim());
    localStorage.setItem(this.emailKey, trimmedEmail);
  }

  // Backward-Compat: falls irgendwo noch setSession(token,...) aufgerufen wird,
  // speichern wir das Token NICHT mehr als Bearer, sondern behandeln "token"
  // als fertigen Authorization Header wenn er so aussieht, ansonsten speichern wir ihn als Basic-Header-Nutzlast.
  // (So crasht nichts, selbst wenn noch alte Calls drin sind.)
  setSession(tokenOrHeader: string, username: string, email: string): void {
    const value = (tokenOrHeader ?? '').trim();

    if (value.toLowerCase().startsWith('basic ')) {
      localStorage.setItem(this.authHeaderKey, value);
    } else if (value.toLowerCase().startsWith('bearer ')) {
      // Falls noch irgendwo Bearer reinkommt, speichern wir es trotzdem als auth header,
      // damit Requests nicht komplett kaputt gehen. (Sprint will aber Basic.)
      localStorage.setItem(this.authHeaderKey, value);
    } else {
      // Fallback: wenn nur base64 o.ä. übergeben wurde
      localStorage.setItem(this.authHeaderKey, `Basic ${value}`);
    }

    localStorage.setItem(this.usernameKey, username);
    localStorage.setItem(this.emailKey, email);
  }

  // beim Logout werden die Daten aus dem localStorage gelöscht
  clear(): void {
    localStorage.removeItem(this.authHeaderKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.emailKey);
  }

  // Gibt den kompletten Authorization Header zurück ("Basic ...")
  getAuthHeader(): string | null {
    return localStorage.getItem(this.authHeaderKey);
  }

  // Für alte Aufrufe: getToken() bleibt bestehen, liefert aber jetzt den Auth Header
  getToken(): string | null {
    return this.getAuthHeader();
  }

  getUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  getEmail(): string | null {
    return localStorage.getItem(this.emailKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAuthHeader();
  }

  private toBase64Utf8(input: string): string {
    // robust für Umlaute / Sonderzeichen
    return btoa(unescape(encodeURIComponent(input)));
  }
}
