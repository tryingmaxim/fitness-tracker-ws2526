import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environment';
import { AuthSessionService } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const auth = session.getAuthHeader();

  // nix gespeichert -> einfach weiter
  if (!auth) return next(req);

  // Nur API Requests (nicht assets, icons etc.)
  const apiBase = (environment.apiBaseUrl || '').replace(/\/$/, '');
  const isApiCall = apiBase
    ? req.url.startsWith(apiBase)
    : req.url.startsWith('/api/');

  if (!isApiCall) return next(req);

  // Authorization nur setzen, wenn nicht schon vorhanden
  if (req.headers.has('Authorization')) return next(req);

  return next(
    req.clone({
      setHeaders: { Authorization: auth },
    })
  );
};
