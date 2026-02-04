import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

const SERVICE_WORKER_SCRIPT = 'ngsw-worker.js';
const SERVICE_WORKER_REGISTRATION_STRATEGY = 'registerWhenStable:30000';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // Der HttpClient wird zentral registriert, damit Interceptors konsistent für alle Requests greifen.
    provideHttpClient(withInterceptors([authInterceptor])),

    provideServiceWorker(SERVICE_WORKER_SCRIPT, {
      enabled: !isDevMode(),
      registrationStrategy: SERVICE_WORKER_REGISTRATION_STRATEGY,
    }),
  ],
};
