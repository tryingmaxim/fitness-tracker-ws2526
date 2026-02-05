import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SLIDES, startSlideshow, stopSlideshow } from '../layout.shared';
import { applyTheme, resolveTheme, setStoredTheme, ThemeMode } from '../theme';

@Component({
  selector: 'app-layout-private',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, NgFor],
  templateUrl: './layout-private.html',
  styleUrl: './layout-private.css',
})
export class LayoutPrivate implements OnInit, OnDestroy {
  readonly slides = SLIDES;
  currentSlideIndex = 0;
  private slideshowTimerId?: number;

  isDarkMode = true;
  username: string | null = null;

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = this.auth.getUsername() || this.auth.getEmail() || 'Gast';

    const initialTheme = resolveTheme('dark');
    this.isDarkMode = initialTheme === 'dark';
    applyTheme(initialTheme);
    this.startSlideshow();
  }

  ngOnDestroy(): void {
    stopSlideshow(this.slideshowTimerId);
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.isDarkMode ? 'light' : 'dark';
    this.isDarkMode = nextTheme === 'dark';
    setStoredTheme(nextTheme);
    applyTheme(nextTheme);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  private startSlideshow(): void {
    this.slideshowTimerId = startSlideshow(this.slides.length, (nextIndex) => {
      this.currentSlideIndex = nextIndex;
    });
  }
}
