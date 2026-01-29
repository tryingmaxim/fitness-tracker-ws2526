import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout-public',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './layout-public.html',
  styleUrl: './layout-public.css',
})
export class LayoutPublic implements OnInit, OnDestroy {
  slides: string[] = [
    'assets/slideshow/GymBild1.png',
    'assets/slideshow/GymBild2.png',
    'assets/slideshow/GymBild3.jpg',
    'assets/slideshow/GymBild5.png',
    'assets/slideshow/GymBild6.png',
    'assets/slideshow/GymBild7.png',
    'assets/slideshow/Bild8.png',
  ];

  current = 0;
  private slideTimer?: number;

  isDarkMode = true;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    // Theme laden
    const stored = localStorage.getItem('theme');
    if (stored === 'light') this.isDarkMode = false;
    if (stored === 'dark') this.isDarkMode = true;
    this.applyTheme();

    // Slideshow
    if (this.slides.length > 1) {
      this.slideTimer = window.setInterval(() => {
        this.current = (this.current + 1) % this.slides.length;
      }, 4000);
    }
  }

  ngOnDestroy(): void {
    if (this.slideTimer) clearInterval(this.slideTimer);
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get displayName(): string {
    return this.auth.getUsername() || this.auth.getEmail() || 'User';
  }

  // zentrale Links: public vs private
  get exercisesLink(): string {
    return this.isLoggedIn ? '/app/exercises' : '/exercises';
  }

  get plansLink(): string {
    return this.isLoggedIn ? '/app/plans' : '/plans';
  }

  get sessionsLink(): string {
    return this.isLoggedIn ? '/app/sessions' : '/sessions';
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
}
