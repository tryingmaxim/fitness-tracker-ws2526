import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { SLIDES, startSlideshow, stopSlideshow } from '../layout.shared';
import { applyTheme, resolveTheme, setStoredTheme, ThemeMode } from '../theme';

@Component({
  selector: 'app-layout-public',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './layout-public.html',
  styleUrl: './layout-public.css',
})
export class LayoutPublic implements OnInit, OnDestroy {
  readonly slides = SLIDES;
  currentSlideIndex = 0;
  private slideshowTimerId?: number;

  isDarkMode = true;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    const initialTheme = resolveTheme('dark');
    this.isDarkMode = initialTheme === 'dark';
    applyTheme(initialTheme);
    this.startSlideshow();
  }

  ngOnDestroy(): void {
    stopSlideshow(this.slideshowTimerId);
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get displayName(): string {
    return this.auth.getUsername() || this.auth.getEmail() || 'User';
  }

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
    const nextTheme: ThemeMode = this.isDarkMode ? 'light' : 'dark';
    this.isDarkMode = nextTheme === 'dark';
    setStoredTheme(nextTheme);
    applyTheme(nextTheme);
  }

  private startSlideshow(): void {
    this.slideshowTimerId = startSlideshow(this.slides.length, (nextIndex) => {
      this.currentSlideIndex = nextIndex;
    });
  }
}
