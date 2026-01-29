import { Injectable } from '@angular/core';

const STORAGE_KEYS = {
  AUTH_HEADER: 'auth_basic_header',
  USERNAME: 'username',
  EMAIL: 'user_email',
} as const;

const AUTH_SCHEMES = {
  BASIC: 'basic ',
  BEARER: 'bearer ',
} as const;

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  setBasicAuthSession(email: string, password: string, username?: string): void {
    const normalizedEmail = this.normalizeText(email);
    const normalizedUsername = this.normalizeText(username ?? normalizedEmail);
    const credentials = `${normalizedEmail}:${password ?? ''}`;

    const authHeader = this.createBasicAuthHeader(credentials);

    localStorage.setItem(STORAGE_KEYS.AUTH_HEADER, authHeader);
    localStorage.setItem(STORAGE_KEYS.USERNAME, normalizedUsername);
    localStorage.setItem(STORAGE_KEYS.EMAIL, normalizedEmail);
  }

  setSession(tokenOrHeader: string, username: string, email: string): void {
    const normalizedHeader = this.normalizeText(tokenOrHeader);
    const authHeader = this.normalizeAuthHeader(normalizedHeader);

    localStorage.setItem(STORAGE_KEYS.AUTH_HEADER, authHeader);
    localStorage.setItem(STORAGE_KEYS.USERNAME, this.normalizeText(username));
    localStorage.setItem(STORAGE_KEYS.EMAIL, this.normalizeText(email));
  }

  clear(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }

  getAuthHeader(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_HEADER);
  }

  getToken(): string | null {
    return this.getAuthHeader();
  }

  getUsername(): string | null {
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
  }

  getEmail(): string | null {
    return localStorage.getItem(STORAGE_KEYS.EMAIL);
  }

  isLoggedIn(): boolean {
    return Boolean(this.getAuthHeader());
  }

  private normalizeAuthHeader(value: string): string {
    const lowerValue = value.toLowerCase();

    if (lowerValue.startsWith(AUTH_SCHEMES.BASIC) || lowerValue.startsWith(AUTH_SCHEMES.BEARER)) {
      return value;
    }

    return `Basic ${value}`;
  }

  private createBasicAuthHeader(credentials: string): string {
    const base64Credentials = this.toBase64Utf8(credentials);
    return `Basic ${base64Credentials}`;
  }

  private toBase64Utf8(input: string): string {
    return btoa(unescape(encodeURIComponent(input)));
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
