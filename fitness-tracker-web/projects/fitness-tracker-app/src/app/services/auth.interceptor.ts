import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from './auth-session.service';

//Token wird aus der Session abgerufen
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const token = session.getToken();

  //Falls kein token vorhanden ist oder /login dann wird der request unverändert weitergeleitet
  if (!token || req.url.endsWith('/login')) {
    return next(req);
  }

  //Ansonten wird ein neuer Request erzeugt und der Token hinuzugefügt
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
