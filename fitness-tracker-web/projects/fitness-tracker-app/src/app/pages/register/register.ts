import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';

type GenderValue = '' | 'm' | 'w' | 'd';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  loading = false;
  error: string | null = null;
  info: string | null = null;

  form = {
    firstName: '',
    lastName: '',
    email: '',
    age: null as number | null,
    gender: '' as GenderValue,
    password: '',
    passwordConfirm: '',
    terms: false,
  };

  private readonly baseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient, private router: Router) {}

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return re.test(email);
  }

  onSubmit(f: NgForm): void {
    if (this.loading) return;

    this.error = null;
    this.info = null;

    if (f.invalid) {
      this.error = 'Bitte fülle alle Pflichtfelder korrekt aus.';
      return;
    }

    const email = (this.form.email ?? '').trim().toLowerCase();
    const firstName = (this.form.firstName ?? '').trim();
    const lastName = (this.form.lastName ?? '').trim();
    const age = this.form.age != null ? Number(this.form.age) : null;
    const password = this.form.password ?? '';
    const passwordConfirm = this.form.passwordConfirm ?? '';

    if (!email || !this.isValidEmail(email)) {
      this.error = 'Bitte gib eine gültige E-Mail-Adresse ein (z. B. name@domain.de).';
      return;
    }

    if (!password || password.length < 8) {
      this.error = 'Passwort muss mindestens 8 Zeichen lang sein.';
      return;
    }

    if (password !== passwordConfirm) {
      this.error = 'Die Passwörter stimmen nicht überein.';
      return;
    }

    if (!this.form.terms) {
      this.error = 'Bitte akzeptiere die Nutzungsbedingungen.';
      return;
    }

    if (!firstName || !lastName || !age) {
      this.error = 'Bitte fülle Vorname, Nachname, E-Mail und Alter aus.';
      return;
    }

    if (age < 12 || age > 100) {
      this.error = 'Bitte gib ein gültiges Alter zwischen 12 und 100 an.';
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      password,
      age,
      gender: this.form.gender || null,
    };

    this.loading = true;

    this.http.post(`${this.baseUrl}/users/register`, payload).subscribe({
      next: () => {
        this.loading = false;
        this.info = 'Erfolgreich registriert 🎉 Du kannst dich jetzt anmelden.';

        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { email } });
        }, 1200);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        if (err?.status === 409) {
          this.error = 'Ein Konto mit dieser E-Mail existiert bereits.';
          return;
        }

        if (err?.status === 400) {
          this.error = err?.error?.detail || err?.error?.message || 'Ungültige Eingaben.';
          return;
        }

        this.error =
          err?.error?.detail ||
          err?.error?.message ||
          'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      },
    });
  }
}
