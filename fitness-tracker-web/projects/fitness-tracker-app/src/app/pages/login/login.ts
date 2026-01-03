import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environment';

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
  loading = false;
  error: string | null = null;

  devBypassEmail = environment.devAuthBypass?.enabled ? environment.devAuthBypass.email : null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Prefill: wenn Register nach /login?email=... weiterleitet
    const prefillEmail = this.route.snapshot.queryParamMap.get('email');
    if (prefillEmail && !this.email) {
      this.email = prefillEmail.trim();
    }
  }

  onLogin(form: NgForm): void {
    if (form.invalid || this.loading) return;

    this.error = null;

    // Dev-Shortcut: wenn Feld leer, autofill
    if (this.devBypassEmail && !this.email) {
      this.email = this.devBypassEmail;
    }

    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;

        // Wenn Guard returnUrl gesetzt hat, dahin zurück
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigate([returnUrl || '/dashboard']);
      },
      error: (err) => {
        this.loading = false;

        const status = err?.status ?? err?.error?.status;
        if (status === 401 || status === 403) {
          this.error = 'Anmeldung fehlgeschlagen: E-Mail oder Passwort ist falsch.';
          return;
        }

        this.error =
          err?.error?.message ||
          err?.error?.detail ||
          err?.message ||
          'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.';

        console.error(err);
      },
    });
  }
}
