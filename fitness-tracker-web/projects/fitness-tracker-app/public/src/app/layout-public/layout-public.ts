import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule, NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-layout-public',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterLink, RouterOutlet],
  templateUrl: './layout-public.html',
  styleUrl: './layout-public.css'
})
export class LayoutPublic implements OnInit, OnDestroy {

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

  // du willst standardmäßig dunkel
  isDarkMode = true;

  ngOnInit(): void {
    // 1) Slideshow starten
    this.timer = window.setInterval(() => {
      this.current = (this.current + 1) % this.slides.length;
    }, 4000);

    // 2) *** GANZ WICHTIG ***: aktuellen Zustand auf <body> anwenden
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;

    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }
}
