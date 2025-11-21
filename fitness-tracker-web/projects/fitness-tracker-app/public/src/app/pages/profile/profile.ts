import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  constructor(private router: Router, private auth: AuthService) {}

  // Platzhalter – später vom Backend / LocalStorage
  user = {
    username: 'Max Mustermann',
    email: 'max@example.com',
    age: 27,
    height: 180,
    weight: 78,
    goals: '3x pro Woche trainieren, mehr Ausdauer',
  };

  ngOnInit(): void {
    this.user.username = this.auth.getUsername() || this.user.username;
    this.user.email = this.auth.getEmail() || this.user.email;
  }

  get initials(): string {
    const parts = this.user.username.split(' ');
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
