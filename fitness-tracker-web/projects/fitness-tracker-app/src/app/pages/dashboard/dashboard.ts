// src/app/pages/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environment';

interface SessionResponse {
  id: number;
  name: string;
  planId: number | null;
  scheduledDate: string;
  planName?: string;
}

interface ExerciseResponse {
  id: number;
  name: string;
  category?: string;
  muscleGroups?: string;
}

interface TrainingPlanResponse {
  id: number;
  name: string;
  description?: string;
}

interface PlanDashboardItem {
  id: number;
  name: string;
  description?: string;
  sessionCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  greeting = this.buildGreeting();
  today = this.buildTodayString();

  // Stats
  stats = [
    { label: 'Sessions diese Woche', value: 0, sub: 'inkl. heutigem Tag' },
    { label: 'Übungen gesamt', value: 0, sub: 'gesamt im System' },
    { label: 'Streak', value: '0 Tage', sub: 'ohne Pause (Platzhalter)' },
  ];

  // Panels
  quickSessions: {
    title: string;
    date: string;
    plan: string;
    focus: string;
  }[] = [];

  lastExercises: {
    name: string;
    category: string;
  }[] = [];

  plansDashboard: PlanDashboardItem[] = [];

  private readonly baseUrl = environment.apiBaseUrl;

  // Rohdaten für Berechnungen
  private sessionsRaw: SessionResponse[] = [];
  private plansRaw: TrainingPlanResponse[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  /* =========================================================
     DATA LOADING
  ========================================================= */

  private loadData(): void {
    // Sessions
    this.http.get<any>(`${this.baseUrl}/training-sessions`).subscribe({
      next: (sessionsRes) => {
        const sessions = this.extractCollection(
          sessionsRes,
          'trainingSessions'
        ) as SessionResponse[];

        this.sessionsRaw = sessions;
        this.processSessions(sessions);
        this.buildPlansDashboard();
      },
      error: (err) =>
        console.error('Fehler beim Laden der Sessions', err),
    });

    // Exercises
    this.http.get<any>(`${this.baseUrl}/exercises`).subscribe({
      next: (exRes) => {
        const exercises = this.extractCollection(
          exRes,
          'exercises'
        ) as ExerciseResponse[];
        this.processExercises(exercises);
      },
      error: (err) =>
        console.error('Fehler beim Laden der Übungen', err),
    });

    // Training Plans
    this.http.get<any>(`${this.baseUrl}/training-plans`).subscribe({
      next: (planRes) => {
        const plans = this.extractCollection(
          planRes,
          'trainingPlans'
        ) as TrainingPlanResponse[];

        this.plansRaw = plans;
        this.buildPlansDashboard();
      },
      error: (err) =>
        console.error('Fehler beim Laden der Trainingspläne', err),
    });
  }

  /* =========================================================
     PROCESS SESSIONS
  ========================================================= */

  private processSessions(sessions: SessionResponse[]): void {
    if (!sessions.length) {
      this.quickSessions = [];
      this.stats[0].value = 0;
      return;
    }

    // chronologisch nach Datum sortieren
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime()
    );

    // nur heutige + zukünftige Sessions
    const upcoming = sorted.filter((s) => {
      const d = new Date(s.scheduledDate);
      d.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return d.getTime() >= today.getTime();
    });

    // Karten für Dashboard (max. 5)
    this.quickSessions = upcoming.slice(0, 5).map((s) => ({
      title: s.name,
      date: this.formatSessionDate(s.scheduledDate),
      plan: s.planName ?? 'Plan ohne Namen',
      focus: 'Geplante Einheit',
    }));

    // Sessions in aktueller Woche für Statistik
    const now = new Date();
    const start = this.startOfWeek(now);
    const end = this.endOfWeek(now);

    this.stats[0].value = sorted.filter((s) => {
      const t = new Date(s.scheduledDate).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;
  }

  /* =========================================================
     PROCESS EXERCISES
  ========================================================= */

  private processExercises(exercises: ExerciseResponse[]): void {
    this.stats[1].value = exercises.length;

    // „Letzte Übungen“ –  ersten 4 Einträge (alphabetisch / wie geliefert)
    this.lastExercises = exercises.slice(0, 4).map((e) => ({
      name: e.name,
      category: e.muscleGroups || e.category || 'Kategorie unbekannt',
    }));
  }

  /* =========================================================
     BUILD PLANS PANEL
  ========================================================= */

  private buildPlansDashboard(): void {
    if (!this.plansRaw.length) {
      this.plansDashboard = [];
      return;
    }

    this.plansDashboard = this.plansRaw.map((p) => {
      const sessionsForPlan = this.sessionsRaw.filter(
        (s) => s.planId === p.id
      );
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: sessionsForPlan.length,
      };
    });
  }

  /* =========================================================
     HELPERS
  ========================================================= */

  private extractCollection(res: any, embeddedKey: string): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?._embedded?.[embeddedKey]))
      return res._embedded[embeddedKey];
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sonntag
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag als Wochenstart
    return new Date(d.setDate(diff));
  }

  private endOfWeek(date: Date): Date {
    const start = this.startOfWeek(date);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  }

  private formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);

  const formatted = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit'
  });

  const weekday = date.toLocaleDateString('de-DE', {
    weekday: 'short'
  });

  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dateStart.getTime() - todayStart.getTime()) / 86400000
  );

  if (diffDays === 0)
    return `Heute (${formatted})`;

  if (diffDays === 1)
    return `Morgen (${formatted})`;

  return `${weekday}. (${formatted})`;
}


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
      month: '2-digit',
    });
  }
}
