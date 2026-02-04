import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app';
import { routes } from './app.routes';

describe('App Test Suite', () => {
  describe('AppComponent', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [AppComponent],
      }).compileComponents();
    });

    it('should create the app', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      expect(app).toBeTruthy();
    });
  });

  describe('Routes', () => {
    it('should contain legacy redirects to /app/*', () => {
      const dashboardRedirect = routes.find((r) => r.path === 'dashboard');
      const progressRedirect = routes.find((r) => r.path === 'training-progress');
      const profileRedirect = routes.find((r) => r.path === 'profile');

      expect(dashboardRedirect).toBeTruthy();
      expect(dashboardRedirect?.redirectTo).toBe('app/dashboard');
      expect(dashboardRedirect?.pathMatch).toBe('full');

      expect(progressRedirect).toBeTruthy();
      expect(progressRedirect?.redirectTo).toBe('app/training-progress');
      expect(progressRedirect?.pathMatch).toBe('full');

      expect(profileRedirect).toBeTruthy();
      expect(profileRedirect?.redirectTo).toBe('app/profile');
      expect(profileRedirect?.pathMatch).toBe('full');
    });

    it('should define a public root layout with children', () => {
      const publicRoot = routes.find((r) => r.path === '' && r.children?.length);

      expect(publicRoot).toBeTruthy();
      expect(publicRoot?.children?.some((c) => c.path === 'login')).toBeTrue();
      expect(publicRoot?.children?.some((c) => c.path === 'register')).toBeTrue();
      expect(publicRoot?.children?.some((c) => c.path === 'exercises')).toBeTrue();
      expect(publicRoot?.children?.some((c) => c.path === 'plans')).toBeTrue();
      expect(publicRoot?.children?.some((c) => c.path === 'sessions')).toBeTrue();
    });

    it('should define a private /app layout route', () => {
      const privateRoot = routes.find((r) => r.path === 'app');

      expect(privateRoot).toBeTruthy();
      expect(privateRoot?.children?.some((c) => c.path === 'dashboard')).toBeTrue();
      expect(privateRoot?.children?.some((c) => c.path === 'training-progress')).toBeTrue();
      expect(privateRoot?.children?.some((c) => c.path === 'profile')).toBeTrue();
      expect(privateRoot?.children?.some((c) => c.path === 'training/start/:sessionId')).toBeTrue();
    });

    it('should contain a wildcard redirect to root', () => {
      const wildcard = routes.find((r) => r.path === '**');

      expect(wildcard).toBeTruthy();
      expect(wildcard?.redirectTo).toBe('');
    });
  });
});
