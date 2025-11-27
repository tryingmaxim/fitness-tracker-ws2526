import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
//Variablen für das Login
export class Login {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;
  devBypassEmail = environment.devAuthBypass?.enabled ? environment.devAuthBypass.email : null;

  constructor(private router: Router, private auth: AuthService) {}

  onLogin(form: NgForm): void {
    if (form.invalid || this.loading) {
      return;
    }

    this.error = null;
    if (this.devBypassEmail && !this.email) {
      this.email = this.devBypassEmail;
    }
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      //login erfolgreich
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      //login fehlgeschlagen
      error: (err) => {
        this.loading = false;
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
