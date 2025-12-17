import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environment';

interface TrainingSessionListItem {
  id: number;
  name: string;
  planId: number | null;
  planName?: string;
  days?: number[];
  exerciseCount?: number;
  performedCount?: number;
}

interface PlannedExerciseFromSession {
  id: number;
  exerciseId: number;
  exerciseName: string;
  category?: string;
  orderIndex: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
}

interface TrainingSessionDetailResponse {
  id: number;
  name: string;
  planId: number | null;
  planName?: string;
  days?: number[];
  exerciseCount?: number;
  performedCount?: number;
  exerciseExecutions: PlannedExerciseFromSession[];
}

type StatusFilter = 'ALL' | 'NEVER' | 'DONE';

interface ExecutedExerciseDto {
  id: number;
  exerciseId: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
  actualSets: number;
  actualReps: number;
  actualWeightKg: number;
  done: boolean;
  notes: string | null;
}

interface TrainingExecutionDto {
  id: number;
  sessionId: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  completedAt: string | null;
  executedExercises: ExecutedExerciseDto[];
}

interface UiSessionProgress {
  id: number;
  name: string;
  planId: number | null;
  planName: string;
  days: number[];
  exerciseCount: number;
  performedCount: number;

  lastSavedAt?: Date;
  lastExecutionId?: number;
  lastStatus?: string;
  lastDurationSeconds?: number | null;
}

@Component({
  selector: 'app-training-progress',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './training-progress.html',
  styleUrl: './training-progress.css',
})
export class TrainingProgress implements OnInit {
  private readonly baseUrl = environment.apiBaseUrl;

  loading = false;
  errorMsg = '';
  infoMsg = '';

  search = '';
  planFilter: number | 'ALL' = 'ALL';
  statusFilter: StatusFilter = 'ALL';

  sessions: UiSessionProgress[] = [];

  // expand / details
  expandedSessionId: number | null = null;
  detailsLoading = false;
  detailsError = '';
  detailCache = new Map<number, TrainingSessionDetailResponse>();

  // executions by session
  executionsLoading = false;
  executionsError = '';
  executionCache = new Map<number, TrainingExecutionDto[]>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.infoMsg = '';
    this.detailsError = '';
    this.executionsError = '';
    this.expandedSessionId = null;

    this.http.get<any>(`${this.baseUrl}/training-sessions?size=200`).subscribe({
      next: (res) => {
        const raw = this.extractCollection(res, 'trainingSessions') as TrainingSessionListItem[];

        this.sessions = (raw ?? []).map((s) => {
          const days = Array.isArray(s?.days) ? s.days.filter((d) => Number.isFinite(Number(d))) : [];
          const performedCount = Number.isFinite(Number(s?.performedCount)) ? Number(s.performedCount) : 0;
          const exerciseCount = Number.isFinite(Number(s?.exerciseCount)) ? Number(s.exerciseCount) : 0;

          return {
            id: s.id,
            name: s?.name ?? 'Unbenannte Session',
            planId: s?.planId ?? null,
            planName: s?.planName ?? '-',
            days: days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 30).sort((a, b) => a - b),
            performedCount,
            exerciseCount,
            lastSavedAt: undefined,
            lastExecutionId: undefined,
            lastStatus: undefined,
            lastDurationSeconds: null,
          };
        });

        this.loading = false;
        if (!this.sessions.length) this.infoMsg = 'Noch keine Sessions vorhanden – lege zuerst Sessions an.';
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Trainingsfortschritt konnte nicht geladen werden.';
      },
    });
  }

  // -------- Filters

  get plansForFilter(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const s of this.sessions) {
      if (typeof s.planId === 'number') map.set(s.planId, s.planName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get filteredSessions(): UiSessionProgress[] {
    const term = this.search.trim().toLowerCase();
    return this.sessions
      .filter((s) => {
        if (this.planFilter !== 'ALL' && s.planId !== this.planFilter) return false;
        if (this.statusFilter === 'NEVER' && s.performedCount > 0) return false;
        if (this.statusFilter === 'DONE' && s.performedCount <= 0) return false;

        if (!term) return true;
        const hay = `${s.name} ${s.planName} ${s.days.join(',')}`.toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => {
        if (b.performedCount !== a.performedCount) return b.performedCount - a.performedCount;
        return a.name.localeCompare(b.name);
      });
  }

  clearFilters(): void {
    this.search = '';
    this.planFilter = 'ALL';
    this.statusFilter = 'ALL';
  }

  // -------- Expand session details (planned + executions)

  toggleDetails(sessionId: number): void {
    this.detailsError = '';
    this.executionsError = '';

    if (this.expandedSessionId === sessionId) {
      this.expandedSessionId = null;
      return;
    }

    this.expandedSessionId = sessionId;

    // load planned details if needed
    if (!this.detailCache.has(sessionId)) {
      this.detailsLoading = true;
      this.http.get<TrainingSessionDetailResponse>(`${this.baseUrl}/training-sessions/${sessionId}`).subscribe({
        next: (detail) => {
          const normalized: TrainingSessionDetailResponse = {
            ...detail,
            exerciseExecutions: Array.isArray(detail.exerciseExecutions)
              ? [...detail.exerciseExecutions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              : [],
          };
          this.detailCache.set(sessionId, normalized);
          this.detailsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.detailsLoading = false;
          this.detailsError = 'Session-Details konnten nicht geladen werden.';
        },
      });
    }

    // load executions if needed
    if (!this.executionCache.has(sessionId)) {
      this.executionsLoading = true;

      //  FIX: HttpParams sauber als String übergeben
      const params = new HttpParams().set('sessionId', String(sessionId));

      this.http.get<TrainingExecutionDto[]>(`${this.baseUrl}/training-executions`, { params }).subscribe({
        next: (execs) => {
          const safe = Array.isArray(execs) ? execs : [];
          const sorted = [...safe].sort((a, b) => this.execSortTime(b) - this.execSortTime(a));
          this.executionCache.set(sessionId, sorted);

          this.applyLatestRunToSession(sessionId, sorted[0] ?? null);

          this.executionsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.executionsLoading = false;

          const status = err?.status;
          const detail = err?.error?.detail || err?.error?.message;

          this.executionsError =
            status === 404
              ? 'Trainingsläufe konnten nicht geladen werden (Endpoint nicht gefunden).'
              : status === 400
              ? `Trainingsläufe konnten nicht geladen werden (Bad Request). ${detail ?? ''}`.trim()
              : `Trainingsläufe konnten nicht geladen werden. ${detail ?? ''}`.trim();
        },
      });
    }
  }

  getDetail(sessionId: number): TrainingSessionDetailResponse | null {
    return this.detailCache.get(sessionId) ?? null;
  }

  // -------- Executions

  runsForSession(sessionId: number): TrainingExecutionDto[] {
    return this.executionCache.get(sessionId) ?? [];
  }

  latestRunForSession(sessionId: number): TrainingExecutionDto | null {
    const runs = this.runsForSession(sessionId);
    return runs.length ? runs[0] : null;
  }

  latestExerciseOfRun(sessionId: number, exerciseId: number): ExecutedExerciseDto | null {
    const run = this.latestRunForSession(sessionId);
    if (!run?.executedExercises?.length) return null;
    return run.executedExercises.find((e) => Number(e.exerciseId) === Number(exerciseId)) ?? null;
  }

  private execSortTime(e: TrainingExecutionDto): number {
    const t = e.completedAt || e.startedAt;
    const dt = t ? new Date(t).getTime() : 0;
    return Number.isFinite(dt) ? dt : 0;
  }

  private durationSecondsOfRun(run: TrainingExecutionDto): number | null {
    const start = run?.startedAt ? new Date(run.startedAt).getTime() : NaN;
    const end = run?.completedAt ? new Date(run.completedAt).getTime() : NaN;
    if (!Number.isFinite(start)) return null;
    const endTime = Number.isFinite(end) ? end : Date.now();
    return Math.max(0, Math.round((endTime - start) / 1000));
  }

  private applyLatestRunToSession(sessionId: number, latest: TrainingExecutionDto | null): void {
    const idx = this.sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return;

    if (!latest) {
      this.sessions[idx].lastSavedAt = undefined;
      this.sessions[idx].lastExecutionId = undefined;
      this.sessions[idx].lastStatus = undefined;
      this.sessions[idx].lastDurationSeconds = null;
      return;
    }

    const lastTimeIso = latest.completedAt || latest.startedAt;
    this.sessions[idx].lastSavedAt = lastTimeIso ? new Date(lastTimeIso) : undefined;
    this.sessions[idx].lastExecutionId = latest.id;
    this.sessions[idx].lastStatus = latest.status;
    this.sessions[idx].lastDurationSeconds = this.durationSecondsOfRun(latest);
  }

  // -------- Formatting helpers

  formatDays(days: number[]): string {
    if (!days?.length) return '-';
    return days.join(', ');
  }

  formatDateTimeIso(iso?: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(seconds?: number | null): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '-';
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);

    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');

    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss.padStart(2, '0')}`;
  }

  // -------- extract collection

  private extractCollection(res: any, embeddedKey: string): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?._embedded?.[embeddedKey])) return res._embedded[embeddedKey];
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }
}
