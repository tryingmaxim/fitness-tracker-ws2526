import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly tokenKey = 'auth_token';
  private readonly usernameKey = 'username';
  private readonly emailKey = 'user_email';

  //Login Daten werden in localStorage gespeichert
  setSession(token: string, username: string, email: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.usernameKey, username);
    localStorage.setItem(this.emailKey, email);
  }

  //beim Logout werden die Daten aus dem localStorage gelöscht
  clear(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.emailKey);
  }

  //liest die gespeicherte Daten aus dem localStorgae
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  getEmail(): string | null {
    return localStorage.getItem(this.emailKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
