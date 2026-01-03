import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environment';

type GenderValue = '' | 'm' | 'w' | 'd';

interface ProfileDto {
  firstName: string;
  lastName: string;
  email: string; // bleibt im Model, aber NICHT editierbar
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
  private readonly baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  loading = false;
  saving = false;

  error: string | null = null;
  info: string | null = null;

  user: ProfileDto = {
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    gender: null,
  };

  editedUser: ProfileDto = { ...this.user };
  isEditing = false;

  constructor(private router: Router, private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Fallback aus Session, bis Backend antwortet
    const email = this.auth.getEmail() || this.auth.getUsername() || '';
    this.user.email = email;
    this.editedUser = { ...this.user };

    this.loadProfileFromBackend();
  }

  get initials(): string {
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? '';
    const initials = (first + last).toUpperCase();
    return initials || 'U';
  }

  startEdit(): void {
    this.isEditing = true;

    // Email wird bewusst NICHT in editedUser geändert
    this.editedUser = { ...this.user };

    this.error = null;
    this.info = null;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editedUser = { ...this.user };
    this.error = null;
    this.info = null;
  }

  saveEdit(): void {
    this.error = null;
    this.info = null;

    const firstName = (this.editedUser.firstName ?? '').trim();
    const lastName = (this.editedUser.lastName ?? '').trim();

    // Email ist NICHT editierbar -> immer aus user übernehmen
    const email = (this.user.email ?? '').trim().toLowerCase();

    if (!email) {
      this.error = 'E-Mail ist nicht verfügbar. Bitte erneut anmelden.';
      return;
    }

    let age: number | null = this.editedUser.age != null ? Number(this.editedUser.age) : null;
    if (age != null && (!Number.isFinite(age) || age < 0 || age > 120)) {
      this.error = 'Bitte gib ein gültiges Alter an.';
      return;
    }

    const gender = (this.editedUser.gender ?? null) as GenderValue | null;

    const payload: ProfileDto = {
      firstName,
      lastName,
      email, // unveränderlich
      age,
      gender,
    };

    this.saving = true;

    // korrekt: /users/me
    this.http.put(`${this.baseUrl}/users/me`, payload).subscribe({
      next: () => {
        this.saving = false;

        // user email bleibt exakt gleich
        this.user = { ...this.user, ...payload, email: this.user.email };
        this.editedUser = { ...this.user };

        this.isEditing = false;
        this.info = 'Profil wurde gespeichert.';
      },
      error: (err) => {
        console.error(err);
        this.saving = false;

        if (err?.status === 401 || err?.status === 403) {
          this.error = 'Bitte anmelden, um dein Profil zu bearbeiten.';
          this.router.navigate(['/login']);
          return;
        }

        if (err?.status === 404 || err?.status === 405) {
          this.error = 'Backend unterstützt /users/me (PUT) noch nicht.';
          return;
        }

        this.error =
          err?.error?.detail ||
          err?.error?.message ||
          'Speichern fehlgeschlagen. Bitte versuche es erneut.';
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private loadProfileFromBackend(): void {
    this.loading = true;
    this.error = null;

    //  korrekt: /users/me
    this.http.get<any>(`${this.baseUrl}/users/me`).subscribe({
      next: (res) => {
        const dto: ProfileDto = {
          firstName: (res?.firstName ?? '').toString(),
          lastName: (res?.lastName ?? '').toString(),

          //  Email bleibt (Session fallback), Backend nur wenn sinnvoll
          email: (res?.email ?? this.user.email ?? '').toString(),

          age: res?.age != null && Number.isFinite(Number(res.age)) ? Number(res.age) : null,
          gender: (res?.gender ?? null) as GenderValue | null,
        };

        this.user = { ...this.user, ...dto };
        this.editedUser = { ...this.user };
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        if (err?.status === 401 || err?.status === 403) {
          this.error = 'Bitte anmelden, um dein Profil zu sehen.';
          this.router.navigate(['/login']);
          return;
        }

        if (err?.status === 404 || err?.status === 405) {
          this.info = 'Profil wird aktuell aus der Session angezeigt (Backend /users/me nicht verfügbar).';
          return;
        }

        this.error =
          err?.error?.detail ||
          err?.error?.message ||
          'Profil konnte nicht geladen werden.';
      },
    });
  }

  genderLabel(value: GenderValue | null): string {
    if (value === 'm') return 'Männlich';
    if (value === 'w') return 'Weiblich';
    if (value === 'd') return 'Divers';
    return 'Nicht angegeben';
  }
}
