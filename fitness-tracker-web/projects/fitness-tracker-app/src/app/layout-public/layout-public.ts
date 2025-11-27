import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule, NgIf, NgForOf } from '@angular/common';

@Component({
  selector: 'app-layout-public',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink, RouterOutlet],
  templateUrl: './layout-public.html',
  styleUrl: './layout-public.css',
})

//UI Funktionen (Slideshow und Darkmode)
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

  //standardmäßig darkmode
  isDarkMode = true;

  //wird ausgeführt wenn Seite geladen wird
  ngOnInit(): void {
    //Slideshow wird gestartet und alle 4 Sekunden wird das Bild gewechselt
    this.timer = window.setInterval(() => {
      this.current = (this.current + 1) % this.slides.length;
    }, 4000);

    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }

  //wird ausgeführt wenn Nutzer Seite verlässt 
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
