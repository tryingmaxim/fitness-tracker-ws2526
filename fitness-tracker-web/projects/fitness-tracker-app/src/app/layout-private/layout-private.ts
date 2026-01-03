import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout-private',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, NgFor],
  templateUrl: './layout-private.html',
  styleUrl: './layout-private.css',
})
export class LayoutPrivate implements OnInit, OnDestroy {
  slides = [
    'assets/GymBild1.png',
    'assets/GymBild2.png',
    'assets/GymBild3.jpg',
    'assets/GymBild5.png',
    'assets/GymBild6.png',
    'assets/GymBild7.png',
    'assets/Bild8.png',
  ];

  current = 0;
  private timer?: number;

  isDarkMode = true;
  username: string | null = null;

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = this.auth.getUsername() || this.auth.getEmail() || 'Gast';

    const stored = localStorage.getItem('theme');
    if (stored === 'light') this.isDarkMode = false;
    if (stored === 'dark') this.isDarkMode = true;

    this.applyTheme();

    if (this.slides.length > 1) {
      this.timer = window.setInterval(() => {
        this.current = (this.current + 1) % this.slides.length;
      }, 4000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(this.isDarkMode ? 'dark-mode' : 'light-mode');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
