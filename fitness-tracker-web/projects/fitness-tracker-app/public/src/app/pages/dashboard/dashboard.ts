import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  greeting = this.buildGreeting();
  today = this.buildTodayString();

  notes = '';

  stats = [
    { label: 'Sessions diese Woche', value: 3, sub: 'inkl. heutigem Tag' },
    { label: 'Übungen gesamt', value: 12, sub: 'letzte 7 Tage' },
    { label: 'Streak', value: '4 Tage', sub: 'ohne Pause' }
  ];

  quickSessions = [
    { title: 'Pull Day', date: 'Heute', plan: 'Oberkörper', focus: 'Rücken & Bizeps' },
    { title: 'Cardio 30 Min', date: 'Morgen', plan: 'Ausdauer', focus: 'lockere Einheit' },
    { title: 'Beine', date: 'Fr.', plan: 'Unterkörper', focus: 'Kniebeugen & RDLs' }
  ];

  lastExercises = [
    { name: 'Bankdrücken', category: 'Brust' },
    { name: 'Latzug', category: 'Rücken' }
  ];

  private buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 11) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  private buildTodayString(): string {
    const d = new Date();
    return d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  }
}
