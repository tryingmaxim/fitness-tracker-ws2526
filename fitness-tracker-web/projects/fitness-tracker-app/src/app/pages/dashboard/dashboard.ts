import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';

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

interface StreakResponse {
  streakDays: number;
}

type DashboardStat = {
  label: string;
  value: number | string;
  sub?: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  greeting = this.buildGreeting();
  today = this.buildTodayString();

  stats: DashboardStat[] = [
    { label: 'Sessions diese Woche', value: 0, sub: 'inkl. heutigem Tag' },
    { label: 'Übungen gesamt', value: 0, sub: 'gesamt im System' },
    { label: 'Streak', value: '0 Tage', sub: 'ohne Pause (Platzhalter)' },
  ];

  quickSessions: { title: string; date: string; plan: string; focus: string }[] = [];
  lastExercises: { name: string; category: string }[] = [];
  plansDashboard: PlanDashboardItem[] = [];

  planTabs: PlanTabItem[] = [];
  planCalendars: PlanCalendar[] = [];
  selectedPlanId: number | null = null;

  private static readonly CALENDAR_DAYS = 30;
  private static readonly QUICK_SESSIONS_LIMIT = 5;
  private static readonly LAST_EXERCISES_LIMIT = 4;
  private static readonly UNKNOWN_DAY_SORT_VALUE = 999;
  private static readonly DEFAULT_PLAN_COLOR_CLASS = 'plan-color-0';
  private static readonly DEFAULT_PLAN_NAME = 'Plan ohne Namen';
  private static readonly DEFAULT_DAY_LABEL = 'Tag -';

  private readonly baseUrl = environment.apiBaseUrl;

  private sessionsRaw: SessionResponse[] = [];
  private plansRaw: TrainingPlanResponse[] = [];

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

  ngOnInit(): void {
    this.loadData();
    this.loadStreak();
  }

  get todayDayOfMonth30(): number {
    const dayOfMonth = new Date().getDate();
    return Math.min(dayOfMonth, Dashboard.CALENDAR_DAYS);
  }

  isTodayCalendarDay(day: number): boolean {
    return day === this.todayDayOfMonth30;
  }

  get selectedPlanDays(): CalendarDayCell[] {
    return this.findSelectedCalendar()?.days ?? [];
  }

  get selectedPlanColorClass(): string {
    return this.findSelectedCalendar()?.colorClass ?? Dashboard.DEFAULT_PLAN_COLOR_CLASS;
  }

  selectPlan(planId: number): void {
    this.selectedPlanId = planId;
  }

  private findSelectedCalendar(): PlanCalendar | undefined {
    return this.planCalendars.find((calendar) => calendar.planId === this.selectedPlanId);
  }

  private loadData(): void {
    this.loadSessions();
    this.loadExercises();
    this.loadPlans();
  }

  private loadSessions(): void {
    this.http.get<unknown>(`${this.baseUrl}/training-sessions`).subscribe({
      next: (sessionsRes) => {
        const sessions = this.extractCollection(sessionsRes, 'trainingSessions');
        this.sessionsRaw = this.mapSessions(sessions);
        this.processSessions(this.sessionsRaw);
        this.buildPlansDashboard();
        this.buildPlanCalendars();
      },
      error: (err) => console.error('Fehler beim Laden der Sessions', err),
    });
  }

  private loadExercises(): void {
    this.http.get<unknown>(`${this.baseUrl}/exercises`).subscribe({
      next: (exRes) => {
        const exercises = this.extractCollection(exRes, 'exercises') as ExerciseResponse[];
        this.processExercises(exercises);
      },
      error: (err) => console.error('Fehler beim Laden der Übungen', err),
    });
  }

  private loadPlans(): void {
    this.http.get<unknown>(`${this.baseUrl}/training-plans`).subscribe({
      next: (planRes) => {
        const plans = this.extractCollection(planRes, 'trainingPlans');
        this.plansRaw = this.mapPlans(plans);
        this.buildPlansDashboard();
        this.buildPlanCalendars();
      },
      error: (err) => console.error('Fehler beim Laden der Trainingspläne', err),
    });
  }

  private mapSessions(rawSessions: unknown[]): SessionResponse[] {
    return (rawSessions ?? []).map((raw) => {
      const session = raw as any;
      return {
        id: Number(session.id),
        name: session.name,
        planId: this.extractPlanId(session),
        days: this.normalizeDays(session.days),
        planName: session.planName ?? session.plan?.name,
      };
    });
  }

  private extractPlanId(session: any): number | null {
    const directId = session.planId != null ? Number(session.planId) : null;
    if (directId != null) return directId;

    const nestedId = session.plan?.id != null ? Number(session.plan.id) : null;
    return nestedId != null ? nestedId : null;
  }

  private normalizeDays(days: unknown): number[] {
    if (!Array.isArray(days)) return [];
    return days.map((day) => Number(day)).filter((day) => this.isValidCalendarDay(day));
  }

  private isValidCalendarDay(day: number): boolean {
    return day >= 1 && day <= Dashboard.CALENDAR_DAYS;
  }

  private mapPlans(rawPlans: unknown[]): TrainingPlanResponse[] {
    return (rawPlans ?? []).map((raw) => {
      const plan = raw as any;
      return {
        id: Number(plan.id),
        name: plan.name,
        description: plan.description,
      };
    });
  }

  private processSessions(sessions: SessionResponse[]): void {
    if (!sessions.length) {
      this.quickSessions = [];
      this.setStatValue(0, 0);
      return;
    }

    const sorted = [...sessions].sort((a, b) => this.compareSessions(a, b));
    this.quickSessions = sorted.slice(0, Dashboard.QUICK_SESSIONS_LIMIT).map((session) => ({
      title: session.name,
      date: this.formatDaysAsTagLabel(session.days),
      plan: session.planName ?? Dashboard.DEFAULT_PLAN_NAME,
      focus: 'Session-Vorlage',
    }));

    this.setStatValue(0, sorted.length);
  }

  private compareSessions(a: SessionResponse, b: SessionResponse): number {
    const aMin = this.minDay(a.days);
    const bMin = this.minDay(b.days);

    if (aMin !== bMin) return aMin - bMin;
    return (a.name ?? '').localeCompare(b.name ?? '');
  }

  private minDay(days: number[]): number {
    const normalized = this.normalizeDays(days);
    if (!normalized.length) return Dashboard.UNKNOWN_DAY_SORT_VALUE;
    return Math.min(...normalized);
  }

  private formatDaysAsTagLabel(days: number[]): string {
    const normalized = this.normalizeDays(days).sort((a, b) => a - b);

    if (!normalized.length) return Dashboard.DEFAULT_DAY_LABEL;
    if (normalized.length === 1) return `Tag ${normalized[0]}`;
    return `Tage ${normalized.join(', ')}`;
  }

  private processExercises(exercises: ExerciseResponse[]): void {
    const safeExercises = exercises ?? [];
    this.setStatValue(1, safeExercises.length);

    this.lastExercises = safeExercises.slice(0, Dashboard.LAST_EXERCISES_LIMIT).map((exercise) => ({
      name: exercise.name,
      category: exercise.muscleGroups || exercise.category || 'Kategorie unbekannt',
    }));
  }

  private buildPlansDashboard(): void {
    if (!this.plansRaw.length) {
      this.plansDashboard = [];
      return;
    }

    this.plansDashboard = this.plansRaw.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      sessionCount: this.sessionsRaw.filter((session) => session.planId === plan.id).length,
    }));
  }

  private buildPlanCalendars(): void {
    if (!this.plansRaw.length) {
      this.planTabs = [];
      this.planCalendars = [];
      this.selectedPlanId = null;
      return;
    }

    this.planTabs = this.plansRaw.map((plan) => ({
      id: plan.id,
      name: plan.name,
      colorClass: this.getColorClassForPlanId(plan.id),
    }));

    this.planCalendars = this.plansRaw.map((plan) => this.buildCalendarForPlan(plan));

    if (this.selectedPlanId == null) {
      this.selectedPlanId = this.planTabs[0]?.id ?? null;
    }
  }

  private buildCalendarForPlan(plan: TrainingPlanResponse): PlanCalendar {
    const colorClass = this.getColorClassForPlanId(plan.id);
    const days = this.createEmptyCalendarDays();

    const sessionsForPlan = this.sessionsRaw
      .filter((session) => session.planId === plan.id)
      .map((session) => ({
        id: session.id,
        name: session.name,
        planId: session.planId,
        planName: session.planName ?? plan.name,
        days: this.normalizeDays(session.days),
      }));

    for (const session of sessionsForPlan) {
      this.assignSessionToDays(days, session, plan.name);
    }

    for (const dayCell of days) {
      dayCell.sessions = [...dayCell.sessions].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }

    return {
      planId: plan.id,
      planName: plan.name,
      colorClass,
      days,
    };
  }

  private createEmptyCalendarDays(): CalendarDayCell[] {
    return Array.from({ length: Dashboard.CALENDAR_DAYS }, (_, index) => ({
      day: index + 1,
      sessions: [],
    }));
  }

  private assignSessionToDays(
    days: CalendarDayCell[],
    session: { id: number; name: string; planId: number | null; planName?: string; days: number[] },
    fallbackPlanName: string
  ): void {
    for (const day of session.days) {
      const cell = days[day - 1];
      if (!cell) continue;

      cell.sessions.push({
        id: session.id,
        name: session.name,
        planId: session.planId,
        planName: session.planName ?? fallbackPlanName,
      });
    }
  }

  private getColorClassForPlanId(planId: number): string {
    const index = Math.abs(Number(planId)) % this.colorClasses.length;
    return this.colorClasses[index];
  }

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

  private extractCollection(res: unknown, key: string): unknown[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;

    const obj = res as any;

    if (Array.isArray(obj[key])) return obj[key];
    if (Array.isArray(obj?._embedded?.[key])) return obj._embedded[key];
    if (Array.isArray(obj?.content)) return obj.content;

    return [];
  }

  private setStatValue(statIndex: number, value: number): void {
    const stat = this.stats[statIndex];
    if (!stat) return;
    stat.value = value;
  }

  private buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  private buildTodayString(): string {
    const date = new Date();
    const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('de-DE');
    return `${weekday}., ${formattedDate}`;
  }
}
