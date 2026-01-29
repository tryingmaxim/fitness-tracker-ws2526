import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should store basic auth header, username and email when setBasicAuthSession is called', () => {
    // Arrange
    const email = ' alice@example.com ';
    const password = 'secret';
    const username = ' Alice ';

    // Act
    service.setBasicAuthSession(email, password, username);

    // Assert
    const authHeader = service.getAuthHeader();
    expect(authHeader).toBeTruthy();
    expect(authHeader?.startsWith('Basic ')).toBeTrue();

    expect(service.getEmail()).toBe('alice@example.com');
    expect(service.getUsername()).toBe('Alice');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('should default username to normalized email when username is not provided', () => {
    // Arrange
    const email = '  bob@example.com  ';
    const password = 'pw';

    // Act
    service.setBasicAuthSession(email, password);

    // Assert
    expect(service.getEmail()).toBe('bob@example.com');
    expect(service.getUsername()).toBe('bob@example.com');
  });

  it('should store header as-is when setSession receives a Basic header', () => {
    // Arrange
    const header = 'Basic abc123';
    const username = 'user';
    const email = 'user@example.com';

    // Act
    service.setSession(header, username, email);

    // Assert
    expect(service.getAuthHeader()).toBe('Basic abc123');
    expect(service.getUsername()).toBe('user');
    expect(service.getEmail()).toBe('user@example.com');
  });

  it('should store header as-is when setSession receives a Bearer header', () => {
    // Arrange
    const header = 'Bearer token123';
    const username = 'user';
    const email = 'user@example.com';

    // Act
    service.setSession(header, username, email);

    // Assert
    expect(service.getAuthHeader()).toBe('Bearer token123');
  });

  it('should prefix Basic when setSession receives a token without scheme', () => {
    // Arrange
    const token = 'abc123';
    const username = 'user';
    const email = 'user@example.com';

    // Act
    service.setSession(token, username, email);

    // Assert
    expect(service.getAuthHeader()).toBe('Basic abc123');
  });

  it('should normalize email to lowercase on setSession', () => {
    // Arrange
    const token = 'Basic abc123';

    // Act
    service.setSession(token, 'User', 'Alice@Example.com');

    // Assert
    expect(service.getEmail()).toBe('alice@example.com');
  });

  it('should clear all session values', () => {
    // Arrange
    service.setSession('Basic abc123', 'user', 'user@example.com');

    // Act
    service.clear();

    // Assert
    expect(service.getAuthHeader()).toBeNull();
    expect(service.getUsername()).toBeNull();
    expect(service.getEmail()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('getToken should return the same value as getAuthHeader for backward compatibility', () => {
    // Arrange
    service.setSession('Basic abc123', 'user', 'user@example.com');

    // Act
    const token = service.getToken();
    const authHeader = service.getAuthHeader();

    // Assert
    expect(token).toBe(authHeader);
  });
});
