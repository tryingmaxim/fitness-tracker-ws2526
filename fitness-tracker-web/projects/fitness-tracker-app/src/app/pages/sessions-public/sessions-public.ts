import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environment';

interface PlannedExerciseResponse {
  exerciseId?: number;
  orderIndex?: number;
  plannedSets?: number;
  plannedReps?: number;
  plannedWeightKg?: number;
  notes?: string | null;
  exercise?: {
    id: number;
    name: string;
  };
}

interface PublicSession {
  id: number;
  name: string;
  days: number[];
  planId?: number | null;
  planName?: string;
  exerciseExecutions?: PlannedExerciseResponse[];
}

@Component({
  selector: 'app-sessions-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions-public.html',
  styleUrls: ['./sessions-public.css'],
})
export class SessionsPublic implements OnInit {
  private readonly baseUrl = environment.apiBaseUrl;

  sessions: PublicSession[] = [];
  selectedSession: PublicSession | null = null;

  loading = false;
  error: string | null = null;

  // ✅ live search
  query = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  // ✅ Live gefilterte Liste (ohne Enter)
  get filteredSessions(): PublicSession[] {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) return this.sessions;

    return this.sessions.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const plan = (s.planName || '').toLowerCase();
      const days = this.formatDays(s.days).toLowerCase();
      return name.includes(q) || plan.includes(q) || days.includes(q);
    });
  }

  private loadSessions(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.baseUrl}/training-sessions?size=200`).subscribe({
      next: (res) => {
        const list = this.normalizeArray(res);

        this.sessions = list.map((s: any): PublicSession => ({
          id: Number(s.id),
          name: s.name,
          planId: s.planId ?? s.plan?.id ?? null,
          planName: s.planName ?? s.plan?.name,
          days: Array.isArray(s.days)
            ? s.days.map((d: any) => Number(d)).filter((d: number) => d >= 1 && d <= 30)
            : [],
        }));

        // wenn aktuell Selected nicht mehr existiert -> reset
        if (this.selectedSession) {
          const stillThere = this.sessions.find((x) => x.id === this.selectedSession!.id) || null;
          this.selectedSession = stillThere;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden der Sessions.';
        this.loading = false;
      },
    });
  }

  selectSession(s: PublicSession): void {
    this.selectedSession = s;

    if (s.exerciseExecutions?.length) return;

    this.http
      .get<any[]>(`${this.baseUrl}/training-sessions/${s.id}/executions`)
      .subscribe({
        next: (execs) => {
          // optional: sortieren nach orderIndex (falls vorhanden)
          const list = (execs ?? []).slice().sort((a: any, b: any) => {
            const ai = a?.orderIndex ?? 999999;
            const bi = b?.orderIndex ?? 999999;
            return ai - bi;
          });
          s.exerciseExecutions = list;
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  clearSelection(): void {
    this.selectedSession = null;
  }

  formatDays(days: number[]): string {
    if (!days?.length) return '–';
    return [...days].sort((a, b) => a - b).join(', ');
  }

  getExerciseName(e: PlannedExerciseResponse): string {
    return e.exercise?.name ?? `Übung #${e.exerciseId}`;
  }

  private normalizeArray(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.content)) return res.content;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res?._embedded?.trainingSessions)) {
      return res._embedded.trainingSessions;
    }
    return [];
  }

  trackBySession = (_: number, s: PublicSession) => s.id;
}
