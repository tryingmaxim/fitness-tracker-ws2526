import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service'; // ✅ NEU

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
  lastDurationSeconds?: number | null;
}

@Component({
  selector: 'app-training-progress',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, RouterModule],
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

  expandedSessionId: number | null = null;
  detailsLoading = false;
  detailsError = '';
  detailCache = new Map<number, TrainingSessionDetailResponse>();

  executionsLoading = false;
  executionsError = '';
  executionCache = new Map<number, TrainingExecutionDto[]>();

  // ✅ NEU: Session Service rein, um Login-Status abzufragen (nur UI)
  constructor(private http: HttpClient, private authSession: AuthSessionService) {}

  // ✅ NEU: wird im HTML genutzt (Button nur wenn eingeloggt)
  get isLoggedIn(): boolean {
    return this.authSession.isLoggedIn();
  }

  ngOnInit(): void {
    this.load();
  }

  //lädt Sessions und Executions und baut daraus Trainingsfortschritt pro Session
  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.infoMsg = '';
    this.detailsError = '';
    this.executionsError = '';
    this.expandedSessionId = null;

    const sessionsReq$ = this.http.get<any>(`${this.baseUrl}/training-sessions?size=200`).pipe(
      catchError((err) => {
        console.error(err);

        // ✅ Sprint 4: ohne Auth -> 401 / 403 sauber anzeigen
        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Bitte anmelden, um deinen Trainingsfortschritt zu sehen.';
        }

        return of(null);
      })
    );

    const executionsReq$ = this.http.get<TrainingExecutionDto[]>(`${this.baseUrl}/training-executions`).pipe(
      catchError((err) => {
        console.error(err);

        // ✅ Sprint 4: ohne Auth -> 401 / 403 sauber anzeigen
        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Bitte anmelden, um deinen Trainingsfortschritt zu sehen.';
        }

        return of([] as TrainingExecutionDto[]);
      })
    );

    //beide Requests parallel laden
    forkJoin([sessionsReq$, executionsReq$]).subscribe({
      next: ([sessionsRes, executionsRes]) => {
        const rawSessions = this.extractCollection(sessionsRes, 'trainingSessions') as TrainingSessionListItem[];
        const allExecutions = Array.isArray(executionsRes) ? executionsRes : [];

        const executionGrouped = this.groupExecutionsBySessionId(allExecutions);
        this.executionCache = executionGrouped;

        const sessionMap = new Map<number, UiSessionProgress>();

        //für jede Session ein UI Modell bauen
        for (const s of rawSessions ?? []) {
          if (!s || !Number.isFinite(Number(s.id))) continue;

          const days = Array.isArray(s?.days) ? s.days.filter((d) => Number.isFinite(Number(d))) : [];
          const exerciseCount = Number.isFinite(Number(s?.exerciseCount)) ? Number(s.exerciseCount) : 0;

          const runs = executionGrouped.get(Number(s.id)) ?? [];
          const performedCount = runs.length > 0
            ? runs.length
            : (Number.isFinite(Number(s?.performedCount)) ? Number(s.performedCount) : 0);

          const ui: UiSessionProgress = {
            id: Number(s.id),
            name: s?.name ?? 'Unbenannte Session',
            planId: s?.planId ?? null,
            planName: s?.planName ?? '-',
            days: days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 30).sort((a, b) => a - b),
            performedCount,
            exerciseCount,
            isDeleted: false,
            lastSavedAt: undefined,
            lastExecutionId: undefined,
            lastStatus: undefined,
            lastDurationSeconds: null,
          };

          sessionMap.set(ui.id, ui);
          this.applyLatestRunToSessionFromRuns(ui, runs);
        }

        //Sonderfall bei gelöschten Sessions, aber Trainingsfortschritt soll trotzdem sichtbar bleiben
        for (const [sid, runs] of executionGrouped.entries()) {
          if (!runs || runs.length === 0) continue;
          if (sessionMap.has(sid)) continue;

          const latest = runs[0] ?? null;
          const sessionName = (latest?.sessionName ?? '').trim();
          const planName = (latest?.planName ?? '').trim();

          const uniqueExerciseIds = this.uniqueExerciseIdsFromRuns(runs);

          const ui: UiSessionProgress = {
            id: sid,
            name: sessionName || `Gelöschte Session #${sid}`,
            planId: null,
            planName: planName || '-',
            days: [],
            performedCount: runs.length,
            exerciseCount: uniqueExerciseIds.length,
            isDeleted: true,
            lastSavedAt: undefined,
            lastExecutionId: undefined,
            lastStatus: undefined,
            lastDurationSeconds: null,
          };

          sessionMap.set(sid, ui);
          this.applyLatestRunToSessionFromRuns(ui, runs);

          const synthetic = this.buildSyntheticDetailFromLatestRun(ui, latest);
          if (synthetic) this.detailCache.set(sid, synthetic);
        }

        this.sessions = [...sessionMap.values()];
        this.loading = false;

        if (!this.sessions.length) {
          this.infoMsg = 'Noch keine Daten vorhanden – erst Training speichern/abschließen, dann erscheint hier der Fortschritt.';
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg = 'Trainingsfortschritt konnte nicht geladen werden.';
      },
    });
  }

  //eindeutige Liste mit allen Trainingsplänen die in Sessions vorkommen
  get plansForFilter(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const s of this.sessions) {
      if (typeof s.planId === 'number' && Number.isFinite(s.planId)) map.set(s.planId, s.planName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  //zeigt Sessions im UI basierend auf Filtern an
  get filteredSessions(): UiSessionProgress[] {
    const term = this.search.trim().toLowerCase();
    return this.sessions
      .filter((s) => {
        if (this.planFilter !== 'ALL' && s.planId !== this.planFilter) return false;
        if (this.statusFilter === 'NEVER' && s.performedCount > 0) return false;
        if (this.statusFilter === 'DONE' && s.performedCount <= 0) return false;

        if (!term) return true;
        const hay = `${s.name} ${s.planName} ${s.days.join(',')} ${s.isDeleted ? 'gelöscht deleted' : ''}`.toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => {
        const at = a.lastSavedAt ? a.lastSavedAt.getTime() : 0;
        const bt = b.lastSavedAt ? b.lastSavedAt.getTime() : 0;
        if (bt !== at) return bt - at;
        if (b.performedCount !== a.performedCount) return b.performedCount - a.performedCount;
        return a.name.localeCompare(b.name);
      });
  }

  clearFilters(): void {
    this.search = '';
    this.planFilter = 'ALL';
    this.statusFilter = 'ALL';
  }

  //anzeigen von Detailansicht
  toggleDetails(sessionId: number): void {
    this.detailsError = '';
    this.executionsError = '';

    if (this.expandedSessionId === sessionId) {
      this.expandedSessionId = null;
      return;
    }

    this.expandedSessionId = sessionId;

    if (!this.detailCache.has(sessionId)) {
      this.detailsLoading = true;
      //Daten vom Backend holem
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

          // ✅ Sprint 4: 401/403 klar
          if (err?.status === 401 || err?.status === 403) {
            this.detailsError = 'Bitte anmelden, um Session-Details zu sehen.';
            return;
          }

          const runs = this.executionCache.get(sessionId) ?? [];
          const latest = runs[0] ?? null;
          const ui = this.sessions.find((x) => x.id === sessionId) ?? null;

          const synthetic = this.buildSyntheticDetailFromLatestRun(ui, latest);
          if (synthetic) {
            this.detailCache.set(sessionId, synthetic);
            this.detailsError = '';
            return;
          }

          this.detailsError = 'Session-Details konnten nicht geladen werden.';
        },
      });
    }

    if (!this.executionCache.has(sessionId)) {
      this.executionsLoading = true;

      const params = new HttpParams().set('sessionId', String(sessionId));
      this.http.get<TrainingExecutionDto[]>(`${this.baseUrl}/training-executions`, { params }).subscribe({
        next: (execs) => {
          const safe = Array.isArray(execs) ? execs : [];
          const sorted = [...safe].sort((a, b) => this.execSortTime(b) - this.execSortTime(a));
          this.executionCache.set(sessionId, sorted);

          const ui = this.sessions.find((x) => x.id === sessionId);
          if (ui) this.applyLatestRunToSessionFromRuns(ui, sorted);

          this.executionsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.executionsLoading = false;

          // ✅ Sprint 4: 401/403 klar
          if (err?.status === 401 || err?.status === 403) {
            this.executionsError = 'Bitte anmelden, um Trainingsläufe zu sehen.';
            return;
          }

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

  //Holt Session Details aus dem Cache
  getDetail(sessionId: number): TrainingSessionDetailResponse | null {
    return this.detailCache.get(sessionId) ?? null;
  }

  //liefert Trainingsläufe einer Session aus dem Cache
  runsForSession(sessionId: number): TrainingExecutionDto[] {
    return this.executionCache.get(sessionId) ?? [];
  }

  //gibt neuesten Trainingslauf einer Sesion zurück
  latestRunForSession(sessionId: number): TrainingExecutionDto | null {
    const runs = this.runsForSession(sessionId);
    return runs.length ? runs[0] : null;
  }

  //sucht bestimmte Übung im neuesten Trainingslauf
  latestExerciseOfRun(sessionId: number, exerciseId: number): ExecutedExerciseDto | null {
    const run = this.latestRunForSession(sessionId);
    if (!run?.executedExercises?.length) return null;
    return run.executedExercises.find((e) => Number(e.exerciseId) === Number(exerciseId)) ?? null;
  }

  //Gruppiert Trainingsläufe nach Sessions
  private groupExecutionsBySessionId(execs: TrainingExecutionDto[]): Map<number, TrainingExecutionDto[]> {
    const map = new Map<number, TrainingExecutionDto[]>();

    for (const e of execs ?? []) {
      const sid = Number(e?.sessionId);
      if (!Number.isFinite(sid) || sid <= 0) continue;

      const arr = map.get(sid) ?? [];
      arr.push(this.normalizeExecution(e));
      map.set(sid, arr);
    }

    for (const [sid, arr] of map.entries()) {
      const sorted = [...arr].sort((a, b) => this.execSortTime(b) - this.execSortTime(a));
      map.set(sid, sorted);
    }

    return map;
  }

  private normalizeExecution(e: TrainingExecutionDto): TrainingExecutionDto {
    return {
      ...e,
      sessionId: Number(e.sessionId),
      sessionName: e?.sessionName ?? null,
      planName: e?.planName ?? null,
      executedExercises: Array.isArray(e.executedExercises) ? e.executedExercises : [],
    };
  }

  //ermittelt eindeutige Liste aller Übungen aus Trainingsläufen
  private uniqueExerciseIdsFromRuns(runs: TrainingExecutionDto[]): number[] {
    const set = new Set<number>();
    for (const r of runs ?? []) {
      for (const ex of r.executedExercises ?? []) {
        const id = Number(ex?.exerciseId);
        if (Number.isFinite(id)) set.add(id);
      }
    }
    return [...set.values()].sort((a, b) => a - b);
  }

  //liefert Zeitpunkt zum sortieren von Trainingsläufen
  private execSortTime(e: TrainingExecutionDto): number {
    const t = e.completedAt || e.startedAt;
    const dt = t ? new Date(t).getTime() : 0;
    return Number.isFinite(dt) ? dt : 0;
  }

  //Dauer eines Trainigslaufs
  private durationSecondsOfRun(run: TrainingExecutionDto): number | null {
    const start = run?.startedAt ? new Date(run.startedAt).getTime() : NaN;
    const end = run?.completedAt ? new Date(run.completedAt).getTime() : NaN;
    if (!Number.isFinite(start)) return null;
    const endTime = Number.isFinite(end) ? end : Date.now();
    return Math.max(0, Math.round((endTime - start) / 1000));
  }

  //überträgt Daten vom Trainingslauf auf die Session
  private applyLatestRunToSessionFromRuns(session: UiSessionProgress, runs: TrainingExecutionDto[]): void {
    const latest = runs?.length ? runs[0] : null;

    if (!latest) {
      session.lastSavedAt = undefined;
      session.lastExecutionId = undefined;
      session.lastStatus = undefined;
      session.lastDurationSeconds = null;
      return;
    }

    const lastTimeIso = latest.completedAt || latest.startedAt;
    session.lastSavedAt = lastTimeIso ? new Date(lastTimeIso) : undefined;
    session.lastExecutionId = latest.id;
    session.lastStatus = latest.status;
    session.lastDurationSeconds = this.durationSecondsOfRun(latest);
  }

  //künstliche Session Details eintragen, falls echte fehlem
  private buildSyntheticDetailFromLatestRun(ui: UiSessionProgress | null, latest: TrainingExecutionDto | null): TrainingSessionDetailResponse | null {
    if (!latest) return null;

    const execs = Array.isArray(latest.executedExercises) ? latest.executedExercises : [];
    if (!execs.length) return null;

    const planned: PlannedExerciseFromSession[] = execs.map((x, idx) => ({
      id: idx + 1,
      exerciseId: Number(x.exerciseId),
      exerciseName: (x.exerciseName ?? '').trim() || `Übung #${Number(x.exerciseId)}`,
      category: (x.exerciseCategory ?? '').trim() || '-',
      orderIndex: idx + 1,
      plannedSets: Number(x.plannedSets ?? 0),
      plannedReps: Number(x.plannedReps ?? 0),
      plannedWeightKg: Number(x.plannedWeightKg ?? 0),
    }));

    const sid = Number(latest.sessionId);
    const name = ui?.name ?? (latest.sessionName ? String(latest.sessionName) : `Gelöschte Session #${sid}`);
    const planName = ui?.planName ?? (latest.planName ? String(latest.planName) : '-');

    return {
      id: sid,
      name,
      planId: null,
      planName,
      days: ui?.days ?? [],
      exerciseCount: planned.length,
      performedCount: (this.executionCache.get(sid) ?? []).length,
      exerciseExecutions: planned,
    };
  }

  //formatiert ausgewählte Trainingstage zu einem lesbaren String für UI
  formatDays(days: number[]): string {
    if (!days?.length) return '-';
    return days.join(', ');
  }

  //Wandelt Zeitstempel in Datumsformat für UI um
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

  //Wandelt Dauer in lesbares Zeitformat für UI um
  formatDuration(seconds?: number | null): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '-';
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);

    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');

    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

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
