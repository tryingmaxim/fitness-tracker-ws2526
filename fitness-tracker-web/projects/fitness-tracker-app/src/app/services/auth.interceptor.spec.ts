import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

import { authInterceptor } from './auth.interceptor';
import { AuthSessionService } from './auth-session.service';
import { environment } from '../../../environment';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let sessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    sessionService = TestBed.inject(AuthSessionService);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should not add Authorization header when no session exists', () => {
    // Arrange
    const url = `${environment.apiBaseUrl}/users/me`;

    // Act
    httpClient.get(url).subscribe();

    // Assert
    const request = httpMock.expectOne((r) => r.url === url);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('should add Authorization header for API requests when session exists', () => {
    // Arrange
    sessionService.setSession('Basic abc123', 'user', 'user@example.com');
    const url = `${environment.apiBaseUrl}/users/me`;

    // Act
    httpClient.get(url).subscribe();

    // Assert
    const request = httpMock.expectOne((r) => r.url === url);
    expect(request.request.headers.get('Authorization')).toBe('Basic abc123');
    request.flush({});
  });

  it('should add Authorization header for absolute dev-server API requests when baseUrl is relative', () => {
    // Arrange
    sessionService.setSession('Basic abc123', 'user', 'user@example.com');
    const abs = new URL(`${environment.apiBaseUrl}/users/me`, 'http://localhost:4200').toString();

    // Act
    httpClient.get(abs).subscribe();

    // Assert
    const request = httpMock.expectOne((r) => r.url === abs);
    expect(request.request.headers.get('Authorization')).toBe('Basic abc123');
    request.flush({});
  });

  it('should not overwrite Authorization header if it is already present', () => {
    // Arrange
    sessionService.setSession('Basic abc123', 'user', 'user@example.com');
    const url = `${environment.apiBaseUrl}/users/me`;

    // Act
    httpClient.get(url, { headers: { Authorization: 'Bearer external' } }).subscribe();

    // Assert
    const request = httpMock.expectOne((r) => r.url === url);
    expect(request.request.headers.get('Authorization')).toBe('Bearer external');
    request.flush({});
  });

  it('should not add Authorization header for non-API requests', () => {
    // Arrange
    sessionService.setSession('Basic abc123', 'user', 'user@example.com');
    const url = '/assets/logo.png';

    // Act
    httpClient.get(url).subscribe();

    // Assert
    const request = httpMock.expectOne((r) => r.url === url);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });
});
