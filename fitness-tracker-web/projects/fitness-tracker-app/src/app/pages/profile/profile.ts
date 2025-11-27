import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  constructor(private router: Router, private auth: AuthService) {}

  //aktuell noch Platzhalterdaten
  user = {
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    age: 25,
    gender: '', 
  };

  editedUser = { ...this.user };

  isEditing = false;

  ngOnInit(): void {
    //Benutzername wird vom Login geholt
    const username = this.auth.getUsername();
    if (username) {
      const parts = username.split(' ');
      this.user.firstName = parts[0] || this.user.firstName;
      this.user.lastName = parts.slice(1).join(' ') || this.user.lastName;
    }

    this.user.email = this.auth.getEmail() || this.user.email;

    this.editedUser = { ...this.user };
  }

  //Initialien des Benutzers
  get initials(): string {
    const first = this.user.firstName?.[0] ?? '';
    const last = this.user.lastName?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  //Bearbeiten starten und Kopie des Benutzers wird erstellt
  startEdit() {
    this.isEditing = true;
    this.editedUser = { ...this.user };
  }

  cancelEdit() {
    this.isEditing = false;
    this.editedUser = { ...this.user };
  }

  saveEdit() {
    this.user = { ...this.editedUser };
    this.isEditing = false;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
