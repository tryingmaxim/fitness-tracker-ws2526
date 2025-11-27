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
  //speichert den Benutzername des eingeloggten Nutzers
  username: string | null = null;

  //Navigation und Benutzerdaten werden übergeben
  constructor(private router: Router, private auth: AuthService) {}

  //wird ausgeführt wenn Seite geladen wird
  ngOnInit(): void {
    //Falls der Benutzer nicht eingeloggt navigation zur login Seite
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    //Slideshow wird gestartet und alle 4 Sekunden wird das Bild gewechselt
    this.timer = window.setInterval(() => {
      this.current = (this.current + 1) % this.slides.length;
    }, 4000);

    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-mode', !this.isDarkMode);

    //Benutzername holen oder Gast als Fallback
    this.username = this.auth.getUsername() || 'Gast';
  }

  //wird ausgeführt wenn Nutzer Seite verlässt 
  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
    document.body.classList.toggle('light-mode', !this.isDarkMode);
  }

  //Benutzer wird ausgeloggt und navigation zur login Seite
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
