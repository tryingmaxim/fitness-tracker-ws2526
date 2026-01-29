import { NgIf } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environment';
import { AuthService } from '../../services/auth.service';

type GenderValue = '' | 'm' | 'w' | 'd';

interface ProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  gender: GenderValue | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  readonly EMPTY_GENDER_VALUE: GenderValue = '';

  private static readonly MAX_AGE = 120;
  private static readonly MIN_AGE = 0;

  private readonly baseUrl = this.normalizeBaseUrl(environment.apiBaseUrl);

  isLoading = false;
  isSaving = false;

  errorMessage: string | null = null;
  infoMessage: string | null = null;

  user: ProfileDto = {
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    gender: null,
  };

  editedUser: ProfileDto = { ...this.user };
  isEditing = false;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly httpClient: HttpClient
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.navigateToLogin();
      return;
    }

    this.user.email = this.getEmailFromSessionFallback();
    this.editedUser = { ...this.user };

    this.loadProfileFromBackend();
  }

  get initials(): string {
    const firstInitial = this.user.firstName?.[0] ?? '';
    const lastInitial = this.user.lastName?.[0] ?? '';
    const combined = (firstInitial + lastInitial).toUpperCase();

    return combined || 'U';
  }

  startEdit(): void {
    this.isEditing = true;
    this.editedUser = { ...this.user };

    this.errorMessage = null;
    this.infoMessage = null;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editedUser = { ...this.user };

    this.errorMessage = null;
    this.infoMessage = null;
  }

  saveEdit(): void {
    this.errorMessage = null;
    this.infoMessage = null;

    const payload = this.buildValidatedPayload();
    if (!payload) return;

    this.isSaving = true;

    this.httpClient.put(`${this.baseUrl}/users/me`, payload).subscribe({
      next: () => {
        this.isSaving = false;

        this.user = { ...this.user, ...payload, email: this.user.email };
        this.editedUser = { ...this.user };
        this.isEditing = false;

        this.infoMessage = 'Profil wurde gespeichert.';
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving = false;
        this.handleSaveError(error);
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.navigateToLogin();
  }

  genderLabel(value: GenderValue | null): string {
    if (value === 'm') return 'Männlich';
    if (value === 'w') return 'Weiblich';
    if (value === 'd') return 'Divers';
    return 'Nicht angegeben';
  }

  ageLabel(age: number | null): string {
    if (age == null) return 'Nicht angegeben';
    return `${age} Jahre`;
  }

  private loadProfileFromBackend(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.httpClient.get<unknown>(`${this.baseUrl}/users/me`).subscribe({
      next: (response) => {
        const dto = this.mapBackendResponseToProfileDto(response);
        this.user = { ...this.user, ...dto };
        this.editedUser = { ...this.user };
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleLoadError(error);
      },
    });
  }

  private buildValidatedPayload(): ProfileDto | null {
    const firstName = (this.editedUser.firstName ?? '').trim();
    const lastName = (this.editedUser.lastName ?? '').trim();
    const email = (this.user.email ?? '').trim().toLowerCase();

    if (!email) {
      this.errorMessage = 'E-Mail ist nicht verfügbar. Bitte erneut anmelden.';
      return null;
    }

    const age = this.validateAge(this.editedUser.age);
    if (age === undefined) return null;

    const gender = (this.editedUser.gender ?? null) as GenderValue | null;

    return {
      firstName,
      lastName,
      email,
      age,
      gender,
    };
  }

  private validateAge(rawAge: number | null): number | null | undefined {
    if (rawAge == null) return null;

    const age = Number(rawAge);
    if (!Number.isFinite(age) || age < Profile.MIN_AGE || age > Profile.MAX_AGE) {
      this.errorMessage = 'Bitte gib ein gültiges Alter an.';
      return undefined;
    }

    return age;
  }

  private handleSaveError(error: HttpErrorResponse): void {
    if (this.isAuthError(error)) {
      this.errorMessage = 'Bitte anmelden, um dein Profil zu bearbeiten.';
      this.navigateToLogin();
      return;
    }

    if (error?.status === 404 || error?.status === 405) {
      this.errorMessage = 'Backend unterstützt /users/me (PUT) noch nicht.';
      return;
    }

    this.errorMessage =
      (error as any)?.error?.detail ||
      (error as any)?.error?.message ||
      'Speichern fehlgeschlagen. Bitte versuche es erneut.';
  }

  private handleLoadError(error: HttpErrorResponse): void {
    if (this.isAuthError(error)) {
      this.errorMessage = 'Bitte anmelden, um dein Profil zu sehen.';
      this.navigateToLogin();
      return;
    }

    if (error?.status === 404 || error?.status === 405) {
      this.infoMessage = 'Profil wird aktuell aus der Session angezeigt (Backend /users/me nicht verfügbar).';
      return;
    }

    this.errorMessage =
      (error as any)?.error?.detail || (error as any)?.error?.message || 'Profil konnte nicht geladen werden.';
  }

  private isAuthError(error: HttpErrorResponse): boolean {
    return error?.status === 401 || error?.status === 403;
  }

  private mapBackendResponseToProfileDto(response: unknown): ProfileDto {
    const res = response as any;

    return {
      firstName: (res?.firstName ?? '').toString(),
      lastName: (res?.lastName ?? '').toString(),
      email: (res?.email ?? this.user.email ?? '').toString(),
      age: res?.age != null && Number.isFinite(Number(res.age)) ? Number(res.age) : null,
      gender: (res?.gender ?? null) as GenderValue | null,
    };
  }

  private getEmailFromSessionFallback(): string {
    return this.authService.getEmail() || this.authService.getUsername() || '';
  }

  private navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private normalizeBaseUrl(rawBaseUrl: string | undefined): string {
    return (rawBaseUrl || '').replace(/\/$/, '');
  }
}
