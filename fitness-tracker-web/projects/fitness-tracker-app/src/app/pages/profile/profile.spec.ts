import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Profile } from './profile';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environment';

class RouterMock {
  navigate = jasmine.createSpy('navigate');
}

class AuthServiceMock {
  private loggedIn = true;

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  setLoggedIn(value: boolean): void {
    this.loggedIn = value;
  }

  getEmail(): string {
    return 'user@example.com';
  }

  getUsername(): string {
    return 'user';
  }

  logout(): void {}
}

describe('Profile', () => {
  let component: Profile;
  let httpMock: HttpTestingController;
  let router: RouterMock;
  let auth: AuthServiceMock;

  const baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Profile, HttpClientTestingModule],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: AuthService, useClass: AuthServiceMock },
      ],
    });

    component = TestBed.inject(Profile);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as unknown as RouterMock;
    auth = TestBed.inject(AuthService) as unknown as AuthServiceMock;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should redirect to /login when not logged in (error case)', () => {
    // Arrange
    auth.setLoggedIn(false);

    // Act
    component.ngOnInit();

    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load profile from backend and merge into user (happy path)', () => {
    // Arrange
    component.ngOnInit();
    const req = httpMock.expectOne(`${baseUrl}/users/me`);

    // Act
    req.flush({
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@example.com',
      age: 30,
      gender: 'm',
    });

    // Assert
    expect(component.isLoading).toBeFalse();
    expect(component.user.firstName).toBe('Max');
    expect(component.user.lastName).toBe('Mustermann');
    expect(component.user.email).toBe('max@example.com');
    expect(component.user.age).toBe(30);
    expect(component.user.gender).toBe('m');
    expect(component.initials).toBe('MM');
  });

  it('should show fallback info message when backend /users/me is not available (405)', () => {
    // Arrange
    component.ngOnInit();
    const req = httpMock.expectOne(`${baseUrl}/users/me`);

    // Act
    req.flush({}, { status: 405, statusText: 'Method Not Allowed' });

    // Assert
    expect(component.isLoading).toBeFalse();
    expect(component.infoMessage).toContain('Backend /users/me nicht verfügbar');
    expect(component.errorMessage).toBeNull();
  });

  it('should validate age and prevent save if invalid (edge case)', () => {
    // Arrange
    component.user.email = 'user@example.com';
    component.editedUser = { ...component.user, age: 999 };

    // Act
    component.saveEdit();

    // Assert
    expect(component.errorMessage).toBe('Bitte gib ein gültiges Alter an.');
    expect(component.isSaving).toBeFalse();
  });

  it('should save profile and keep email unchanged (happy path)', () => {
    // Arrange
    component.user = {
      firstName: 'A',
      lastName: 'B',
      email: 'user@example.com',
      age: null,
      gender: null,
    };
    component.editedUser = { ...component.user, firstName: ' Anna ', lastName: ' Becker ', age: 25, gender: 'w' };

    // Act
    component.saveEdit();

    const req = httpMock.expectOne(`${baseUrl}/users/me`);
    expect(req.request.method).toBe('PUT');

    req.flush({});

    // Assert
    expect(component.isSaving).toBeFalse();
    expect(component.isEditing).toBeFalse();
    expect(component.infoMessage).toBe('Profil wurde gespeichert.');

    expect(component.user.firstName).toBe('Anna');
    expect(component.user.lastName).toBe('Becker');
    expect(component.user.age).toBe(25);
    expect(component.user.gender).toBe('w');
    expect(component.user.email).toBe('user@example.com');
  });

  it('should handle save auth error and navigate to login (error case)', () => {
    // Arrange
    component.user.email = 'user@example.com';
    component.editedUser = { ...component.user, firstName: 'X', lastName: 'Y', age: 20, gender: 'm' };

    // Act
    component.saveEdit();

    const req = httpMock.expectOne(`${baseUrl}/users/me`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Assert
    expect(component.isSaving).toBeFalse();
    expect(component.errorMessage).toContain('Bitte anmelden');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should map gender labels correctly', () => {
    // Arrange / Act / Assert
    expect(component.genderLabel('m')).toBe('Männlich');
    expect(component.genderLabel('w')).toBe('Weiblich');
    expect(component.genderLabel('d')).toBe('Divers');
    expect(component.genderLabel(null)).toBe('Nicht angegeben');
    expect(component.genderLabel('')).toBe('Nicht angegeben');
  });

  it('should format age label', () => {
    // Arrange / Act / Assert
    expect(component.ageLabel(null)).toBe('Nicht angegeben');
    expect(component.ageLabel(0)).toBe('0 Jahre');
    expect(component.ageLabel(21)).toBe('21 Jahre');
  });
});
