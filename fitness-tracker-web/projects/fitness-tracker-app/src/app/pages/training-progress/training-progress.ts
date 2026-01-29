import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

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
  exerciseName?: string | null;
  exerciseCategory?: string | null;
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
  sessionName?: string | null;
  planName?: string | null;
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
  isDeleted?: boolean;
  lastSavedAt?: Date;
  lastExecutionId?: number;
  lastStatus?: string;
}

@Component({
  selector: 'app-training-progress',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, RouterModule],
  templateUrl: './training-progress.html',
  styleUrl: './training-progress.css',
})
export class TrainingProgress implements OnInit {
  readonly ALL_FILTER: 'ALL' = 'ALL';
  readonly ALL_STATUS_FILTER: StatusFilter = 'ALL';

  private static readonly DEFAULT_PAGE_SIZE = 200;

  private readonly baseUrl = environment.apiBaseUrl;

  isLoading = false;
  isLoggedIn = false;

  errorMessage = '';
  infoMessage = '';

  searchTerm = '';
  planFilter: number | 'ALL' = this.ALL_FILTER;
  statusFilter: StatusFilter = this.ALL_STATUS_FILTER;

  sessions: UiSessionProgress[] = [];
  filteredSessions: UiSessionProgress[] = [];
  plansForFilter: { id: number; name: string }[] = [];

  expandedSessionId: number | null = null;

  isDetailsLoading = false;
  detailsErrorMessage = '';

  private readonly detailCache = new Map<number, TrainingSessionDetailResponse>();
  private readonly executionCache = new Map<number, TrainingExecutionDto[]>();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authSessionService: AuthSessionService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authSessionService.isLoggedIn();
    this.load();
  }

  load(): void {
    this.resetUiStateForLoad();

    forkJoin([this.fetchSessions(), this.fetchExecutions()]).subscribe({
      next: ([sessionsResponse, executions]) => {
        const rawSessions = this.extractCollection(sessionsResponse, 'trainingSessions') as TrainingSessionListItem[];
        const executionsBySessionId = this.groupExecutionsBySessionId(executions ?? []);

        this.executionCache.clear();
        for (const [sessionId, runs] of executionsBySessionId.entries()) {
          this.executionCache.set(sessionId, runs);
        }

        const baseSessions = this.buildUiSessions(rawSessions ?? [], executionsBySessionId);
        this.sessions = this.addDeletedSessionsFromExecutions(baseSessions, executionsBySessionId);

        this.rebuildDerivedLists();

        this.isLoading = false;
        if (!this.sessions.length && !this.errorMessage) {
          this.infoMessage = 'Noch keine Daten vorhanden – erst Training speichern oder abschließen.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Trainingsfortschritt konnte nicht geladen werden.';
      },
    });
  }

  rebuildDerivedLists(): void {
    this.plansForFilter = this.buildPlansForFilter(this.sessions);
    this.filteredSessions = this.buildFilteredSessions(this.sessions);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.planFilter = this.ALL_FILTER;
    this.statusFilter = this.ALL_STATUS_FILTER;
    this.rebuildDerivedLists();
  }

  toggleDetails(sessionId: number): void {
    this.detailsErrorMessage = '';

    if (this.expandedSessionId === sessionId) {
      this.expandedSessionId = null;
      return;
    }

    this.expandedSessionId = sessionId;

    if (!this.detailCache.has(sessionId)) {
      this.loadSessionDetails(sessionId);
    }

    if (!this.executionCache.has(sessionId)) {
      this.loadExecutionsForSession(sessionId);
    }
  }

  getDetail(sessionId: number): TrainingSessionDetailResponse | null {
    return this.detailCache.get(sessionId) ?? null;
  }

  runsForSession(sessionId: number): TrainingExecutionDto[] {
    return this.executionCache.get(sessionId) ?? [];
  }

  getLatestExerciseOfLatestRun(sessionId: number, exerciseId: number): ExecutedExerciseDto | null {
    const runs = this.runsForSession(sessionId);
    const latestRun = runs.length ? runs[0] : null;
    if (!latestRun?.executedExercises?.length) return null;

    return latestRun.executedExercises.find((e) => Number(e.exerciseId) === Number(exerciseId)) ?? null;
  }

  resolveExerciseName(exerciseName: string | null | undefined, exerciseId: number): string {
    const trimmed = (exerciseName ?? '').trim();
    return trimmed ? trimmed : `Übung #${exerciseId}`;
  }

  formatDays(days: number[] | null | undefined): string {
    if (!days || days.length === 0) return '-';
    return days.join(', ');
  }

  formatDateTimeIso(iso?: string | null): string {
    if (!iso) return '-';

    const date = new Date(iso);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private addDeletedSessionsFromExecutions(
    sessions: UiSessionProgress[],
    executionsBySessionId: Map<number, TrainingExecutionDto[]>
  ): UiSessionProgress[] {
    const existingIds = new Set<number>(sessions.map((s) => s.id));
    const result = [...sessions];

    for (const [sessionId, runs] of executionsBySessionId.entries()) {
      if (existingIds.has(sessionId) || runs.length === 0) continue;

      const latestRun = runs[0];

      const deletedSession: UiSessionProgress = {
        id: sessionId,
        name: (latestRun.sessionName ?? '').trim() || `Gelöschte Session #${sessionId}`,
        planId: null,
        planName: (latestRun.planName ?? '').trim() || '-',
        days: [],
        exerciseCount: latestRun.executedExercises?.length ?? 0,
        performedCount: runs.length,
        isDeleted: true,
      };

      this.applyLatestRunToSession(deletedSession, runs);
      result.push(deletedSession);

      if (!this.detailCache.has(sessionId)) {
        this.detailCache.set(sessionId, this.buildSyntheticDetailFromLatestRun(deletedSession, latestRun, runs.length));
      }
    }

    return result;
  }

  private buildSyntheticDetailFromLatestRun(
    session: UiSessionProgress,
    latestRun: TrainingExecutionDto,
    performedCount: number
  ): TrainingSessionDetailResponse {
    const executedExercises = Array.isArray(latestRun.executedExercises) ? latestRun.executedExercises : [];

    const exercises: PlannedExerciseFromSession[] = executedExercises.map((ex, index) => ({
      id: index + 1,
      exerciseId: Number(ex.exerciseId),
      exerciseName: this.resolveExerciseName(ex.exerciseName, Number(ex.exerciseId)),
      category: (ex.exerciseCategory ?? '').trim() || '-',
      orderIndex: index + 1,
      plannedSets: Number(ex.plannedSets ?? 0),
      plannedReps: Number(ex.plannedReps ?? 0),
      plannedWeightKg: Number(ex.plannedWeightKg ?? 0),
    }));

    return {
      id: session.id,
      name: session.name,
      planId: null,
      planName: session.planName,
      days: [],
      exerciseCount: exercises.length,
      performedCount,
      exerciseExecutions: exercises,
    };
  }

  private buildPlansForFilter(sessions: UiSessionProgress[]): { id: number; name: string }[] {
    const map = new Map<number, string>();

    for (const s of sessions) {
      if (typeof s.planId === 'number' && Number.isFinite(s.planId)) {
        map.set(s.planId, s.planName);
      }
    }

    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildFilteredSessions(sessions: UiSessionProgress[]): UiSessionProgress[] {
    const term = this.searchTerm.trim().toLowerCase();

    return [...sessions]
      .filter((s) => this.matchesFilters(s, term))
      .sort((a, b) => this.compareSessionsForList(a, b));
  }

  private matchesFilters(session: UiSessionProgress, term: string): boolean {
    if (this.planFilter !== this.ALL_FILTER && session.planId !== this.planFilter) return false;
    if (this.statusFilter === 'NEVER' && session.performedCount > 0) return false;
    if (this.statusFilter === 'DONE' && session.performedCount <= 0) return false;

    if (!term) return true;

    const text = `${session.name} ${session.planName} ${session.days.join(',')} ${session.isDeleted ? 'gelöscht deleted' : ''}`
      .toLowerCase();

    return text.includes(term);
  }

  private compareSessionsForList(a: UiSessionProgress, b: UiSessionProgress): number {
    const tA = a.lastSavedAt?.getTime() ?? 0;
    const tB = b.lastSavedAt?.getTime() ?? 0;

    if (tA !== tB) return tB - tA;
    if (a.performedCount !== b.performedCount) return b.performedCount - a.performedCount;

    return a.name.localeCompare(b.name);
  }

  private applyLatestRunToSession(session: UiSessionProgress, runs: TrainingExecutionDto[]): void {
    const latest = runs.length ? runs[0] : null;
    if (!latest) return;

    const time = latest.completedAt || latest.startedAt;
    session.lastSavedAt = time ? new Date(time) : undefined;
    session.lastExecutionId = latest.id;
    session.lastStatus = latest.status;
  }

  private fetchSessions(): Observable<unknown> {
    const params = new HttpParams().set('size', String(TrainingProgress.DEFAULT_PAGE_SIZE));

    return this.httpClient.get(`${this.baseUrl}/training-sessions`, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Bitte anmelden, um deinen Trainingsfortschritt zu sehen.';
        }
        return of(null);
      })
    );
  }

  private fetchExecutions(): Observable<TrainingExecutionDto[]> {
    return this.httpClient.get<TrainingExecutionDto[]>(`${this.baseUrl}/training-executions`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Bitte anmelden, um deinen Trainingsfortschritt zu sehen.';
        }
        return of([]);
      })
    );
  }

  private loadSessionDetails(sessionId: number): void {
    this.isDetailsLoading = true;

    this.httpClient.get<TrainingSessionDetailResponse>(`${this.baseUrl}/training-sessions/${sessionId}`).subscribe({
      next: (detail) => {
        const sorted = Array.isArray(detail.exerciseExecutions)
          ? [...detail.exerciseExecutions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          : [];

        this.detailCache.set(sessionId, { ...detail, exerciseExecutions: sorted });
        this.isDetailsLoading = false;
      },
      error: () => {
        this.isDetailsLoading = false;

        if (this.detailCache.has(sessionId)) {
          this.detailsErrorMessage = '';
          return;
        }

        this.detailsErrorMessage = 'Session-Details konnten nicht geladen werden.';
      },
    });
  }

  private loadExecutionsForSession(sessionId: number): void {
    const params = new HttpParams().set('sessionId', String(sessionId));

    this.httpClient.get<TrainingExecutionDto[]>(`${this.baseUrl}/training-executions`, { params }).subscribe({
      next: (executions) => {
        const safe = Array.isArray(executions) ? executions : [];
        const sorted = [...safe].sort(
          (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
        );

        this.executionCache.set(sessionId, sorted);
      },
      error: () => {
        this.executionCache.set(sessionId, []);
      },
    });
  }

  private groupExecutionsBySessionId(executions: TrainingExecutionDto[]): Map<number, TrainingExecutionDto[]> {
    const map = new Map<number, TrainingExecutionDto[]>();

    for (const e of executions ?? []) {
      const id = Number(e.sessionId);
      if (!Number.isFinite(id) || id <= 0) continue;

      const list = map.get(id) ?? [];
      list.push({
        ...e,
        executedExercises: Array.isArray(e.executedExercises) ? e.executedExercises : [],
      });

      map.set(id, list);
    }

    for (const [id, list] of map.entries()) {
      map.set(
        id,
        [...list].sort(
          (a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime()
        )
      );
    }

    return map;
  }

  private extractCollection(response: unknown, embeddedKey: string): unknown[] {
    const res = response as any;

    if (Array.isArray(res)) return res;
    if (Array.isArray(res?._embedded?.[embeddedKey])) return res._embedded[embeddedKey];
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;

    return [];
  }

  private buildUiSessions(
    rawSessions: TrainingSessionListItem[],
    executionsBySessionId: Map<number, TrainingExecutionDto[]>
  ): UiSessionProgress[] {
    const map = new Map<number, UiSessionProgress>();

    for (const raw of rawSessions) {
      const id = Number(raw.id);
      if (!Number.isFinite(id) || id <= 0) continue;

      const runs = executionsBySessionId.get(id) ?? [];

      const session: UiSessionProgress = {
        id,
        name: raw.name ?? 'Unbenannte Session',
        planId: raw.planId ?? null,
        planName: raw.planName ?? '-',
        days: Array.isArray(raw.days) ? raw.days : [],
        exerciseCount: Number(raw.exerciseCount ?? 0),
        performedCount: runs.length,
        isDeleted: false,
      };

      this.applyLatestRunToSession(session, runs);
      map.set(id, session);
    }

    return [...map.values()];
  }

  private resetUiStateForLoad(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this.detailsErrorMessage = '';
    this.expandedSessionId = null;
  }
}
