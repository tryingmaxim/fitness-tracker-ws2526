import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { environment } from '../../../environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let sessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, AuthSessionService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionService = TestBed.inject(AuthSessionService);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should login successfully and resolve username from backend', () => {
    // Arrange
    const email = 'Alice@Example.com';
    const password = 'secret';

    // Act
    let resultUsername = '';
    service.login(email, password).subscribe((result) => {
      resultUsername = result.username;
      expect(result.token.startsWith('Basic ')).toBeTrue();
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/users/me`);
    expect(request.request.method).toBe('GET');

    request.flush({ username: 'alice' });

    // Assert
    expect(sessionService.isLoggedIn()).toBeTrue();
    expect(sessionService.getEmail()).toBe('alice@example.com');
    expect(resultUsername).toBe('alice');
  });

  it('should fallback username to backend email when username is missing', () => {
    // Arrange
    const email = 'Alice@Example.com';
    const password = 'secret';

    // Act
    let resultUsername = '';
    service.login(email, password).subscribe((result) => {
      resultUsername = result.username;
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/users/me`);
    request.flush({ email: 'alice.backend@example.com' });

    // Assert
    expect(resultUsername).toBe('alice.backend@example.com');
  });

  it('should clear session when backend login validation fails', () => {
    // Arrange
    const email = 'user@example.com';
    const password = 'wrong';

    // Act
    service.login(email, password).subscribe({
      next: () => fail('Expected error'),
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/users/me`);
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Assert
    expect(sessionService.isLoggedIn()).toBeFalse();
    expect(sessionService.getAuthHeader()).toBeNull();
  });

  it('logout should clear the session', () => {
    // Arrange
    sessionService.setSession('Basic abc', 'user', 'user@example.com');

    // Act
    service.logout();

    // Assert
    expect(sessionService.isLoggedIn()).toBeFalse();
  });
});
