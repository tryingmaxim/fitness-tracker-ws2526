// src/app/pages/sessions/sessions.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environment';

interface TrainingPlan {
  id: number;
  name: string;
  description?: string;
}

interface TrainingSession {
  id?: number;
  name: string;
  date?: string | Date;
  planId: number | null;
  planName?: string;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sessions.html',
  styleUrls: ['./sessions.css'],
})
export class Sessions implements OnInit {
  plans: TrainingPlan[] = [];
  sessions: TrainingSession[] = [];

  form = {
    planId: null as number | null,
    name: '',
    date: '',
  };

  loadingPlans = false;
  loadingSessions = false;
  creating = false;

  errorMsg = '';
  infoMsg = '';

  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlans();
    this.loadSessions();
  }

  add(): void {
    this.errorMsg = '';
    this.infoMsg = '';

    const trimmedName = this.form.name?.trim();
    if (!trimmedName || !this.form.date || !this.form.planId) {
      this.errorMsg = 'Bitte Plan, Name und Datum angeben.';
      return;
    }

    const payload = {
      planId: this.form.planId,
      name: trimmedName,
      scheduledDate: this.form.date,
    };

    this.creating = true;
    this.http.post<any>(`${this.baseUrl}/training-sessions`, payload).subscribe({
      next: () => {
        this.infoMsg = 'Session wurde hinzugefügt.';
        this.form.name = '';
        this.form.date = '';
        this.loadSessions();
        this.loadPlans();
        this.creating = false;
      },
      error: (err) => {
        this.creating = false;
        this.errorMsg = err?.error?.detail || 'Session konnte nicht angelegt werden.';
        console.error(err);
      },
    });
  }

  getPlanName(planId: number | null, fallback?: string): string {
    if (fallback) {
      return fallback;
    }
    const plan = this.plans.find((p) => p.id === planId);
    return plan?.name ?? '-';
  }

  trackBySession = (_: number, session: TrainingSession) =>
    session.id ?? `${session.name}-${session.date}`;

  private loadPlans(): void {
    this.loadingPlans = true;
    this.http.get<any>(`${this.baseUrl}/training-plans`).subscribe({
      next: (res) => {
        this.plans = this.flattenCollection(res, 'trainingPlans').map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
        }));
        if (!this.plans.length) {
          this.form.planId = null;
        } else if (!this.form.planId || !this.plans.some((p) => p.id === this.form.planId)) {
          this.form.planId = this.plans[0]?.id ?? null;
        }
        this.loadingPlans = false;
      },
      error: (err) => {
        this.errorMsg = 'Trainingspläne konnten nicht geladen werden.';
        this.loadingPlans = false;
        console.error(err);
      },
    });
  }

  private loadSessions(): void {
    this.loadingSessions = true;
    this.http.get<any>(`${this.baseUrl}/training-sessions`).subscribe({
      next: (res) => {
        this.sessions = this.flattenCollection(res, 'trainingSessions').map((session) =>
          this.toUiSession(session)
        );
        this.loadingSessions = false;
      },
      error: (err) => {
        this.errorMsg = 'Sessions konnten nicht geladen werden.';
        this.loadingSessions = false;
        console.error(err);
      },
    });
  }

  private toUiSession(session: any): TrainingSession {
    const planId = session?.planId ?? session?.plan?.id ?? null;
    const date =
      session?.scheduledDate ??
      session?.plannedDate ??
      session?.date ??
      session?.scheduled_at ??
      session?.planned_at ??
      '';

    return {
      id: session?.id ?? session?.sessionId,
      name: session?.name ?? session?.title ?? 'Unbenannte Session',
      date,
      planId,
      planName: session?.planName ?? session?.plan?.name,
    };
  }

  private flattenCollection(res: any, embeddedKey: string): any[] {
    if (Array.isArray(res)) {
      return res;
    }

    if (Array.isArray(res?._embedded?.[embeddedKey])) {
      return res._embedded[embeddedKey];
    }

    if (Array.isArray(res?.content)) {
      return res.content;
    }

    if (Array.isArray(res?.items)) {
      return res.items;
    }

    if (Array.isArray(res?.data)) {
      return res.data;
    }

    if (res && typeof res === 'object') {
      return [res];
    }

    return [];
  }
}
