import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthSessionService } from './auth-session.service';

const LOGIN_URL_SEGMENTS = ['/login'] as const;

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const sessionService = inject(AuthSessionService);
  if (sessionService.isLoggedIn()) return true;

  const router = inject(Router);
  return router.createUrlTree([...LOGIN_URL_SEGMENTS]);
};
