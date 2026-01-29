import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environment';
import { AuthSessionService } from './auth-session.service';

const HEADER_AUTHORIZATION = 'Authorization';
const API_PATH_PREFIX = '/api/';

function removeTrailingSlashes(value: string): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function tryParseUrl(value: string, baseUrl: string): URL | null {
  try {
    return new URL(value, baseUrl);
  } catch {
    return null;
  }
}

function isApiRequest(requestUrl: string, apiBaseUrl: string): boolean {
  const request = tryParseUrl(requestUrl, window.location.origin);
  if (!request) return false;

  if (request.pathname.startsWith(API_PATH_PREFIX)) return true;

  const base = tryParseUrl(removeTrailingSlashes(apiBaseUrl), window.location.origin);
  if (!base) return false;

  return request.origin === base.origin && request.pathname.startsWith(base.pathname);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has(HEADER_AUTHORIZATION)) return next(req);

  const sessionService = inject(AuthSessionService);
  const authHeader = sessionService.getAuthHeader();
  if (!authHeader) return next(req);

  if (!isApiRequest(req.url, environment.apiBaseUrl)) return next(req);

  return next(
    req.clone({
      setHeaders: { [HEADER_AUTHORIZATION]: authHeader },
    })
  );
};
