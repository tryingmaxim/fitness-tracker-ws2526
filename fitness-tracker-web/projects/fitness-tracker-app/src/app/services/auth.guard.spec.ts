import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { authGuard } from './auth.guard';
import { AuthSessionService } from './auth-session.service';

describe('authGuard', () => {
  let sessionService: AuthSessionService;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [AuthSessionService],
    });

    sessionService = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);

    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow activation when user is logged in', () => {
    // Arrange
    sessionService.setSession('Basic abc', 'user', 'user@example.com');

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    // Assert
    expect(result).toBeTrue();
  });

  it('should redirect to login when user is not logged in', () => {
    // Arrange
    spyOn(router, 'createUrlTree').and.callThrough();

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    // Assert
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
