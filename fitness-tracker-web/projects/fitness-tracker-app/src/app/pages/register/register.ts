
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_AGE = 12;
const MAX_AGE = 100;
const REDIRECT_DELAY_MS = 1200;

type GenderValue = '' | 'm' | 'w' | 'd';

interface RegisterFormModel {
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  gender: GenderValue;
  password: string;
  passwordConfirm: string;
  terms: boolean;
}

interface NormalizedFormData {
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  gender: GenderValue | null;
  password: string;
  passwordConfirm: string;
  termsAccepted: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  isLoading = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  formModel: RegisterFormModel = {
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    gender: '',
    password: '',
    passwordConfirm: '',
    terms: false,
  };

  private readonly baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(form: NgForm): void {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = null;
    this.infoMessage = null;

    const normalized = this.normalizeFormData();
    const errorMessage = this.validateForm(form, normalized);
    if (errorMessage) {
      this.errorMessage = errorMessage;
      return;
    }

    const payload = this.buildPayload(normalized);
    this.isLoading = true;

    this.http.post(`${this.baseUrl}/users/register`, payload).subscribe({
      next: () => this.handleSuccess(normalized.email),
      error: (error) => this.handleError(error),
    });
  }

  private normalizeFormData(): NormalizedFormData {
    return {
      firstName: this.normalizeName(this.formModel.firstName),
      lastName: this.normalizeName(this.formModel.lastName),
      email: this.normalizeEmail(this.formModel.email),
      age: this.normalizeAge(this.formModel.age),
      gender: this.formModel.gender || null,
      password: this.formModel.password ?? '',
      passwordConfirm: this.formModel.passwordConfirm ?? '',
      termsAccepted: this.formModel.terms,
    };
  }

  private validateForm(form: NgForm, data: NormalizedFormData): string | null {
    if (form.invalid) {
      return 'Bitte f\u00fclle alle Pflichtfelder korrekt aus.';
    }

    if (!data.email || !EMAIL_PATTERN.test(data.email)) {
      return 'Bitte gib eine g\u00fcltige E-Mail-Adresse ein (z. B. name@domain.de).';
    }

    if (!data.password || data.password.length < MIN_PASSWORD_LENGTH) {
      return `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
    }

    if (data.password !== data.passwordConfirm) {
      return 'Die Passw\u00f6rter stimmen nicht \u00fcberein.';
    }

    if (!data.termsAccepted) {
      return 'Bitte akzeptiere die Nutzungsbedingungen.';
    }

    if (!data.firstName || !data.lastName || data.age === null) {
      return 'Bitte f\u00fclle Vorname, Nachname, E-Mail und Alter aus.';
    }

    if (data.age < MIN_AGE || data.age > MAX_AGE) {
      return `Bitte gib ein g\u00fcltiges Alter zwischen ${MIN_AGE} und ${MAX_AGE} an.`;
    }

    return null;
  }

  private buildPayload(data: NormalizedFormData): {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    age: number;
    gender: GenderValue | null;
  } {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      age: data.age as number,
      gender: data.gender,
    };
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private normalizeName(name: string): string {
    return (name ?? '').trim();
  }

  private normalizeAge(age: number | null): number | null {
    if (age === null || age === undefined) {
      return null;
    }

    const parsed = Number(age);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private handleSuccess(email: string): void {
    this.isLoading = false;
    this.infoMessage = 'Erfolgreich registriert! Du kannst dich jetzt anmelden.';

    window.setTimeout(() => {
      this.router.navigate(['/login'], { queryParams: { email } });
    }, REDIRECT_DELAY_MS);
  }

  private handleError(error: unknown): void {
    console.error(error);
    this.isLoading = false;

    const status = (error as { status?: number })?.status;
    if (status === 409) {
      this.errorMessage = 'Ein Konto mit dieser E-Mail existiert bereits.';
      return;
    }

    if (status === 400) {
      this.errorMessage =
        (error as { error?: { detail?: string; message?: string } })?.error?.detail ||
        (error as { error?: { detail?: string; message?: string } })?.error?.message ||
        'Ung\u00fcltige Eingaben.';
      return;
    }

    this.errorMessage =
      (error as { error?: { detail?: string; message?: string } })?.error?.detail ||
      (error as { error?: { detail?: string; message?: string } })?.error?.message ||
      'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
  }
}
