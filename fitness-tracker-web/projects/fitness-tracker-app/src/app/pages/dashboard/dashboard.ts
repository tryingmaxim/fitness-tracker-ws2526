import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environment';

//definiert Datentypen für die API Antworten
interface SessionResponse {
  id: number;
  name: string;
  planId: number | null;
  days: number[]; 
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

interface PlanTabItem {
  id: number;
  name: string;
  colorClass: string;
}

interface CalendarSessionItem {
  id: number;
  name: string;
  planId: number | null;
  planName?: string;
}

interface CalendarDayCell {
  day: number;
  sessions: CalendarSessionItem[];
}

interface PlanCalendar {
  planId: number;
  planName: string;
  colorClass: string;
  days: CalendarDayCell[];
}

//Backend response von /training-executions/stats/streak
interface StreakResponse {
  streakDays: number;
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

  //Variablen der Daten die im UI angezeigt werden
  stats = [
    { label: 'Sessions diese Woche', value: 0, sub: 'inkl. heutigem Tag' },
    { label: 'Übungen gesamt', value: 0, sub: 'gesamt im System' },
    { label: 'Streak', value: '0 Tage', sub: 'ohne Pause (Platzhalter)' },
  ];

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

  //Kalender (Tabs)
  planTabs: PlanTabItem[] = [];
  planCalendars: PlanCalendar[] = [];
  selectedPlanId: number | null = null;

  private readonly baseUrl = environment.apiBaseUrl;

  private sessionsRaw: SessionResponse[] = [];
  private plansRaw: TrainingPlanResponse[] = [];

  //Palette für Planfarben (stabil über planId%len)
  private readonly colorClasses = [
    'plan-color-0',
    'plan-color-1',
    'plan-color-2',
    'plan-color-3',
    'plan-color-4',
    'plan-color-5',
    'plan-color-6',
    'plan-color-7',
  ];

  constructor(private http: HttpClient) {}

  //wird ausgeführt wenn Seite geladen wird
  ngOnInit(): void {
    this.loadData();
    this.loadStreak(); 
  }

  //Heute-Logik für den Kalender
  get todayDayOfMonth30(): number {
    const day = new Date().getDate(); 
    return Math.min(day, 30); //maximal 30 Tage --> wenn es der 31. ist wird auf 30 gedeckelt
  }

  isTodayCalendarDay(day: number): boolean {
    return day === this.todayDayOfMonth30;
  }

  //Variablen für den Kalender holen

  get selectedPlanDays(): CalendarDayCell[] {
    const cal = this.planCalendars.find((c) => c.planId === this.selectedPlanId);
    return cal?.days ?? [];
  }

  get selectedPlanColorClass(): string {
    const cal = this.planCalendars.find((c) => c.planId === this.selectedPlanId);
    return cal?.colorClass ?? 'plan-color-0';
  }

  selectPlan(planId: number): void {
    this.selectedPlanId = planId;
  }

  private getColorClassForPlanId(planId: number): string {
    const idx = Math.abs(Number(planId)) % this.colorClasses.length;
    return this.colorClasses[idx];
  }

  //holt Daten vom Backend und verarbeitet sie, damit das Dashboard gefüllt werden kann
  private loadData(): void {
    this.http.get<any>(`${this.baseUrl}/training-sessions`).subscribe({
      next: (sessionsRes) => {
        const sessions = this.extractCollection(sessionsRes, 'trainingSessions') as any[];

        this.sessionsRaw = (sessions ?? []).map((s: any) => ({
          id: Number(s.id),
          name: s.name,
          planId:
            s.planId != null
              ? Number(s.planId)
              : s.plan?.id != null
                ? Number(s.plan.id)
                : null,
          days: Array.isArray(s.days)
            ? s.days.map((d: any) => Number(d)).filter((d: number) => d >= 1 && d <= 30)
            : [],
          planName: s.planName ?? s.plan?.name,
        }));

        this.processSessions(this.sessionsRaw);
        this.buildPlansDashboard();
        this.buildPlanCalendars();
      },
      error: (err) => console.error('Fehler beim Laden der Sessions', err),
    });

    this.http.get<any>(`${this.baseUrl}/exercises`).subscribe({
      next: (exRes) => {
        const exercises = this.extractCollection(exRes, 'exercises') as ExerciseResponse[];
        this.processExercises(exercises);
      },
      error: (err) => console.error('Fehler beim Laden der Übungen', err),
    });

    this.http.get<any>(`${this.baseUrl}/training-plans`).subscribe({
      next: (planRes) => {
        const plans = this.extractCollection(planRes, 'trainingPlans') as TrainingPlanResponse[];

        this.plansRaw = (plans ?? []).map((p: any) => ({
          id: Number(p.id),
          name: p.name,
          description: p.description,
        }));

        this.buildPlansDashboard();
        this.buildPlanCalendars();
      },
      error: (err) => console.error('Fehler beim Laden der Trainingspläne', err),
    });
  }

  private processSessions(sessions: SessionResponse[]): void {
    //Wenn keine Sessions vorhanden sind wird die Liste und Anzeige im Dashboard auf 0 gesetzt
    if (!sessions.length) {
      this.quickSessions = [];
      this.stats[0].value = 0;
      return;
    }

    const sorted = [...sessions].sort((a, b) => {
      const aMin = this.minDay(a.days);
      const bMin = this.minDay(b.days);
      if (aMin !== bMin) return aMin - bMin;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

    this.quickSessions = sorted.slice(0, 5).map((s) => ({
      title: s.name,
      date: this.formatDaysAsTagLabel(s.days),
      plan: s.planName ?? 'Plan ohne Namen',
      focus: 'Session-Vorlage',
    }));

    //Statistik für Sessions diese Woche 
    this.stats[0].value = sorted.length;
  }

  private minDay(days: number[]): number {
    const clean = (days ?? []).map((d) => Number(d)).filter((d) => d >= 1 && d <= 30);
    if (!clean.length) return 999;
    return Math.min(...clean);
  }

  private formatDaysAsTagLabel(days: number[]): string {
    const clean = (days ?? [])
      .map((d) => Number(d))
      .filter((d) => d >= 1 && d <= 30)
      .sort((a, b) => a - b);

    if (!clean.length) return 'Tag -';
    if (clean.length === 1) return `Tag ${clean[0]}`;
    return `Tage ${clean.join(', ')}`;
  }

  private processExercises(exercises: ExerciseResponse[]): void {
    //Statistik der gesamten Übungen
    this.stats[1].value = exercises.length;

    //die letzten 4 Übungen werden angezeigt
    this.lastExercises = (exercises ?? []).slice(0, 4).map((e) => ({
      name: e.name,
      category: e.muscleGroups || e.category || 'Kategorie unbekannt',
    }));
  }

  private buildPlansDashboard(): void {
    //Wenn keine Sessions vorhanden sind wird die Liste und Anzeige im Dashboard auf 0 gesetzt
    if (!this.plansRaw.length) {
      this.plansDashboard = [];
      return;
    }

    //Anzahl der Sessions für jeden Trainingsplan
    this.plansDashboard = this.plansRaw.map((p) => {
      const sessionsForPlan = this.sessionsRaw.filter((s) => s.planId === p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: sessionsForPlan.length,
      };
    });
  }

  //Plan-Tabs + 1-30 Kalender pro Plan bauen
  private buildPlanCalendars(): void {
    if (!this.plansRaw.length) {
      this.planTabs = [];
      this.planCalendars = [];
      this.selectedPlanId = null;
      return;
    }

    this.planTabs = this.plansRaw.map((p) => ({
      id: p.id,
      name: p.name,
      colorClass: this.getColorClassForPlanId(p.id),
    }));

    this.planCalendars = this.plansRaw.map((p) => {
      const colorClass = this.getColorClassForPlanId(p.id);

      //Tage 1-30 initialisieren
      const days: CalendarDayCell[] = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        sessions: [],
      }));

      //Sessions in die passenden Tage einsortieren
      const sessionsForPlan = this.sessionsRaw
        .filter((s) => s.planId === p.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          planId: s.planId,
          planName: s.planName ?? p.name,
          days: (s.days ?? []).map((d) => Number(d)).filter((d) => d >= 1 && d <= 30),
        }));

      sessionsForPlan.forEach((s) => {
        s.days.forEach((d) => {
          const cell = days[d - 1];
          if (!cell) return;
          cell.sessions.push({
            id: s.id,
            name: s.name,
            planId: s.planId,
            planName: s.planName,
          });
        });
      });

      days.forEach((cell) => {
        cell.sessions = cell.sessions.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      });

      return {
        planId: p.id,
        planName: p.name,
        colorClass,
        days,
      };
    });

    if (this.selectedPlanId == null) {
      this.selectedPlanId = this.planTabs[0]?.id ?? null;
    }
  }

  //Streak von Trainingsausführungen laden
  private loadStreak(): void {
    this.http.get<StreakResponse>(`${this.baseUrl}/training-executions/stats/streak`).subscribe({
      next: (res) => {
        const days = Math.max(0, Number(res?.streakDays ?? 0));
        this.stats[2].value = `${days} Tage`;
        this.stats[2].sub = days > 0 ? 'ohne Pause' : 'noch keine Serie';
      },
      error: () => {
        this.stats[2].value = '0 Tage';
        this.stats[2].sub = 'Streak nicht verfügbar (Backend)';
      },
    });
  }

  //Helper für unterschiedliche Backend Antwort Formaten
  private extractCollection(res: any, key: string): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;

    if (res && Array.isArray(res[key])) return res[key];
    if (res && Array.isArray(res?._embedded?.[key])) return res._embedded[key];

    if (res && Array.isArray(res?.content)) return res.content;

    return [];
  }

  private buildGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  private buildTodayString(): string {
    const d = new Date();
    const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' });
    const date = d.toLocaleDateString('de-DE');
    return `${weekday}., ${date}`;
  }
}
