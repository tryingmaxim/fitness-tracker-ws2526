import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

const DEFAULT_RETURN_URL = '/dashboard';
const AUTH_ERROR_MESSAGE =
  'Anmeldung fehlgeschlagen: E-Mail oder Passwort ist falsch.';
const FALLBACK_ERROR_MESSAGE =
  'Anmeldung fehlgeschlagen. Bitte pr\u00fcfe deine Eingaben.';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  email = '';
  password = '';
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const prefillEmail = this.getPrefillEmail();
    if (prefillEmail) {
      this.email = prefillEmail;
    }
  }

  onLogin(form: NgForm): void {
    if (form.invalid || this.isLoading) {
      return;
    }

    this.errorMessage = null;

    const email = this.email.trim();
    const password = this.password;
    this.isLoading = true;

    this.auth.login(email, password).subscribe({
      next: () => this.handleLoginSuccess(),
      error: (error) => this.handleLoginError(error),
    });
  }

  private getPrefillEmail(): string | null {
    const prefillEmail = this.route.snapshot.queryParamMap.get('email');
    const trimmed = prefillEmail?.trim();
    return trimmed ? trimmed : null;
  }

  private handleLoginSuccess(): void {
    this.isLoading = false;
    this.router.navigate([this.getReturnUrl()]);
  }

  private handleLoginError(error: unknown): void {
    this.isLoading = false;
    this.errorMessage = this.getErrorMessage(error);
    console.error(error);
  }

  private getReturnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || DEFAULT_RETURN_URL;
  }

  private getErrorMessage(error: unknown): string {
    const status =
      (error as { status?: number; error?: { status?: number } })?.status ??
      (error as { error?: { status?: number } })?.error?.status;

    if (status === 401 || status === 403) {
      return AUTH_ERROR_MESSAGE;
    }

    const message =
      (error as { error?: { message?: string; detail?: string }; message?: string })
        ?.error?.message ||
      (error as { error?: { message?: string; detail?: string } })?.error?.detail ||
      (error as { message?: string })?.message;

    return message || FALLBACK_ERROR_MESSAGE;
  }
}
