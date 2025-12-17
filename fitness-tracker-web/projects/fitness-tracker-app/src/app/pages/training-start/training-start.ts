import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { Subscription, forkJoin, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../../../environment';

type UiState = 'loading' | 'ready' | 'error';

interface PlannedExerciseFromSession {
  id: number; // ExerciseExecution.id
  exerciseId: number;
  exerciseName: string;
  category?: string;
  muscleGroups?: string;
  orderIndex: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
  notes?: string;
}

interface TrainingSessionResponse {
  id: number;
  name: string;
  planId: number;
  planName: string;
  days: number[];
  exerciseCount: number;
  performedCount: number;
  exerciseExecutions: PlannedExerciseFromSession[];
}

interface TrainingExecutionResponse {
  id: number;
  sessionId: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  completedAt: string | null;
  executedExercises: ExecutedExerciseResponse[];
}

interface ExecutedExerciseResponse {
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

interface ActualEntry {
  exerciseId: number;
  actualSets: number;
  actualReps: number;
  actualWeightKg: number;
  done: boolean;
  notes: string;
}

@Component({
  selector: 'app-training-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './training-start.html',
  styleUrl: './training-start.css',
})
export class TrainingStart implements OnInit, OnDestroy {
  private readonly baseUrl = environment.apiBaseUrl;

  state: UiState = 'loading';
  errorMessage = '';

  sessionId: number | null = null;
  session: TrainingSessionResponse | null = null;

  executionId: number | null = null;
  executionStatus: 'IN_PROGRESS' | 'COMPLETED' | null = null;
  startedAt: Date | null = null;
  completedAt: Date | null = null;

  // actual per exerciseId
  actual: Record<number, ActualEntry> = {};

  // UX
  toast: { type: 'success' | 'error' | 'info'; text: string } | null = null;
  starting = false;
  saving = false;
  finishing = false;

  private sub = new Subscription();

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.sub.add(
      this.route.paramMap
        .pipe(
          switchMap((params) => {
            const idStr = params.get('sessionId');
            const id = idStr ? Number(idStr) : NaN;

            if (!idStr || Number.isNaN(id)) {
              this.state = 'error';
              this.errorMessage = 'Ungültige Session-ID in der URL.';
              return of(null);
            }

            this.sessionId = id;
            this.state = 'loading';
            this.errorMessage = '';

            return this.http.get<TrainingSessionResponse>(`${this.baseUrl}/training-sessions/${id}`).pipe(
              catchError((err: HttpErrorResponse) => {
                this.state = 'error';
                this.errorMessage = this.humanError(err, 'Session konnte nicht geladen werden.');
                return of(null);
              })
            );
          })
        )
        .subscribe((sessionRes) => {
          if (!sessionRes) return;

          this.session = this.normalizeSession(sessionRes);
          this.initActualFromPlan();
          this.restoreLocalDraft();

          // Resume execution if draft had one
          if (this.executionId && this.sessionId) {
            this.loadExecution(this.executionId);
          } else {
            this.state = 'ready';
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // -------------------------
  // UI Actions
  // -------------------------

  startTraining(): void {
    if (!this.session || this.sessionId == null) return;

    if (!this.session.exerciseExecutions?.length) {
      this.showToast('error', 'Diese Session hat noch keine Übungen. Bitte zuerst Übungen hinzufügen.');
      return;
    }

    if (this.executionStatus === 'IN_PROGRESS') {
      this.showToast('info', 'Training läuft bereits.');
      return;
    }

    if (this.executionStatus === 'COMPLETED') {
      this.showToast('error', 'Dieses Training ist bereits abgeschlossen.');
      return;
    }

    this.starting = true;

    this.http
      .post<TrainingExecutionResponse>(`${this.baseUrl}/training-executions`, { sessionId: this.sessionId })
      .subscribe({
        next: (te) => {
          this.applyExecution(te);
          this.persistLocalDraft();
          this.state = 'ready';

          this.showToast('success', 'Training gestartet. Let’s go 💪');
          this.starting = false;
        },
        error: (err: HttpErrorResponse) => {
          this.showToast('error', this.humanError(err, 'Training konnte nicht gestartet werden.'));
          this.starting = false;
        },
      });
  }

  saveProgress(): void {
    if (!this.session || this.sessionId == null) return;

    if (!this.executionId || this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', 'Bitte starte zuerst das Training.');
      return;
    }

    this.saving = true;

    const requests = this.session.exerciseExecutions.map((p) => {
      const a = this.actual[p.exerciseId];

      const body = {
        exerciseId: p.exerciseId,
        actualSets: Math.max(0, Number(a?.actualSets ?? 0)),
        actualReps: Math.max(0, Number(a?.actualReps ?? 0)),
        actualWeightKg: Math.max(0, Number(a?.actualWeightKg ?? 0)),
        done: Boolean(a?.done ?? false),
        notes: (a?.notes ?? '').trim() || null,
      };

      return this.http.put<TrainingExecutionResponse>(
        `${this.baseUrl}/training-executions/${this.executionId}/exercises`,
        body
      );
    });

    forkJoin(requests).subscribe({
      next: () => {
        // Wichtig: einmal sauber aus dem Backend laden, damit Notes/Werte garantiert korrekt sind
        this.loadExecutionAndThen(() => {
          this.persistLocalDraft();
          this.showToast('success', 'Fortschritt gespeichert ✅');
          this.saving = false;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.persistLocalDraft();
        this.showToast('error', this.humanError(err, 'Speichern fehlgeschlagen.'));
        this.saving = false;
      },
    });
  }

  finishTraining(): void {
    if (!this.executionId) {
      this.showToast('error', 'Bitte starte zuerst das Training.');
      return;
    }

    if (this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', 'Training ist nicht im Status IN_PROGRESS.');
      return;
    }

    this.finishing = true;

    const saveRequests =
      this.session?.exerciseExecutions?.map((p) => {
        const a = this.actual[p.exerciseId];
        return this.http.put<TrainingExecutionResponse>(
          `${this.baseUrl}/training-executions/${this.executionId}/exercises`,
          {
            exerciseId: p.exerciseId,
            actualSets: Math.max(0, Number(a?.actualSets ?? 0)),
            actualReps: Math.max(0, Number(a?.actualReps ?? 0)),
            actualWeightKg: Math.max(0, Number(a?.actualWeightKg ?? 0)),
            done: Boolean(a?.done ?? false),
            notes: (a?.notes ?? '').trim() || null,
          }
        );
      }) ?? [];

    const saveAll$ = saveRequests.length ? forkJoin(saveRequests) : of([]);

    saveAll$
      .pipe(
        switchMap(() =>
          this.http.post<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${this.executionId}/complete`, {})
        ),
        catchError((err: HttpErrorResponse) => {
          throw err;
        })
      )
      .subscribe({
        next: () => {
          // auch nach complete nochmal reloaden, damit completedAt/notes etc. safe sind
          this.loadExecutionAndThen(() => {
            this.clearLocalDraft();
            this.showToast('success', 'Training abgeschlossen 🏁');
            this.finishing = false;
          });
        },
        error: (err: HttpErrorResponse) => {
          this.persistLocalDraft();
          this.showToast('error', this.humanError(err, 'Abschließen fehlgeschlagen.'));
          this.finishing = false;
        },
      });
  }

  cancelTraining(): void {
    if (!this.executionId) {
      this.clearLocalDraft();
      this.resetRuntime();
      this.showToast('info', 'Entwurf verworfen.');
      return;
    }

    this.http.delete(`${this.baseUrl}/training-executions/${this.executionId}`).subscribe({
      next: () => {
        this.clearLocalDraft();
        this.resetRuntime();
        this.showToast('info', 'Training abgebrochen und gelöscht.');
      },
      error: (err: HttpErrorResponse) => {
        this.showToast('error', this.humanError(err, 'Abbrechen fehlgeschlagen.'));
      },
    });
  }

  onNumberChange(exerciseId: number): void {
    const a = this.actual[exerciseId];
    if (!a) return;

    a.actualSets = this.sanitizeInt(a.actualSets);
    a.actualReps = this.sanitizeInt(a.actualReps);
    a.actualWeightKg = this.sanitizeFloat(a.actualWeightKg);

    this.persistLocalDraft();
  }

  onToggleDone(exerciseId: number, checked: boolean): void {
    const a = this.actual[exerciseId];
    if (!a) return;
    a.done = checked;
    this.persistLocalDraft();
  }

  onNotesChange(exerciseId: number): void {
    const a = this.actual[exerciseId];
    if (!a) return;
    a.notes = (a.notes ?? '').toString();
    this.persistLocalDraft();
  }

  // -------------------------
  // UI computed
  // -------------------------

  get isInProgress(): boolean {
    return this.executionStatus === 'IN_PROGRESS';
  }

  get isCompleted(): boolean {
    return this.executionStatus === 'COMPLETED';
  }

  get doneCount(): number {
    return Object.values(this.actual).filter((x) => x.done).length;
  }

  get totalCount(): number {
    return this.session?.exerciseExecutions?.length ?? 0;
  }

  get percent(): number {
    const total = this.totalCount;
    if (!total) return 0;
    return Math.round((this.doneCount / total) * 100);
  }

  // -------------------------
  // Backend load + mapping
  // -------------------------

  private loadExecutionAndThen(fn: () => void): void {
    if (!this.executionId) {
      fn();
      return;
    }
    this.http.get<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${this.executionId}`).subscribe({
      next: (te) => {
        this.applyExecution(te);
        fn();
      },
      error: () => {
        // not fatal, but we keep UI state
        fn();
      },
    });
  }

  private loadExecution(executionId: number): void {
    this.http.get<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${executionId}`).subscribe({
      next: (te) => {
        this.applyExecution(te);
        this.state = 'ready';
      },
      error: () => {
        this.executionId = null;
        this.executionStatus = null;
        this.startedAt = null;
        this.completedAt = null;
        this.persistLocalDraft();
        this.state = 'ready';
      },
    });
  }

  private applyExecution(te: TrainingExecutionResponse): void {
    this.executionId = te.id ?? null;
    this.executionStatus = (te.status as any) ?? null;
    this.startedAt = te.startedAt ? new Date(te.startedAt) : null;
    this.completedAt = te.completedAt ? new Date(te.completedAt) : null;

    if (Array.isArray(te.executedExercises)) {
      for (const e of te.executedExercises) {
        const exId = Number(e.exerciseId);
        if (!Number.isFinite(exId)) continue;

        if (!this.actual[exId]) {
          this.actual[exId] = {
            exerciseId: exId,
            actualSets: 0,
            actualReps: 0,
            actualWeightKg: 0,
            done: false,
            notes: '',
          };
        }

        this.actual[exId].actualSets = Math.max(0, Number(e.actualSets ?? 0));
        this.actual[exId].actualReps = Math.max(0, Number(e.actualReps ?? 0));
        this.actual[exId].actualWeightKg = Math.max(0, Number(e.actualWeightKg ?? 0));
        this.actual[exId].done = Boolean(e.done);
        this.actual[exId].notes = (e.notes ?? '') || '';
      }
    }
  }

  private initActualFromPlan(): void {
    if (!this.session) return;

    const next: Record<number, ActualEntry> = {};
    for (const p of this.session.exerciseExecutions) {
      next[p.exerciseId] = {
        exerciseId: p.exerciseId,
        actualSets: 0,
        actualReps: 0,
        actualWeightKg: 0,
        done: false,
        notes: '',
      };
    }
    this.actual = next;
  }

  private normalizeSession(s: TrainingSessionResponse): TrainingSessionResponse {
    return {
      ...s,
      days: Array.isArray(s.days) ? s.days : [],
      exerciseExecutions: Array.isArray(s.exerciseExecutions)
        ? [...s.exerciseExecutions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [],
    };
  }

  // -------------------------
  // Local draft (resume)
  // -------------------------

  private localKey(sessionId: number): string {
    return `trainingExecutionDraft:session:${sessionId}`;
  }

  private persistLocalDraft(): void {
    if (!this.sessionId) return;
    const payload = {
      sessionId: this.sessionId,
      executionId: this.executionId,
      executionStatus: this.executionStatus,
      startedAt: this.startedAt ? this.startedAt.toISOString() : null,
      completedAt: this.completedAt ? this.completedAt.toISOString() : null,
      actual: this.actual,
    };
    try {
      localStorage.setItem(this.localKey(this.sessionId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private restoreLocalDraft(): void {
    if (!this.sessionId) return;
    const raw = localStorage.getItem(this.localKey(this.sessionId));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId !== this.sessionId) return;

      this.executionId = parsed.executionId ?? null;
      this.executionStatus = parsed.executionStatus ?? null;

      this.startedAt = parsed.startedAt ? new Date(parsed.startedAt) : null;
      this.completedAt = parsed.completedAt ? new Date(parsed.completedAt) : null;

      if (parsed.actual && typeof parsed.actual === 'object') {
        for (const key of Object.keys(parsed.actual)) {
          const exId = Number(key);
          if (!this.actual[exId]) continue;
          const src = parsed.actual[key];

          this.actual[exId] = {
            exerciseId: exId,
            actualSets: Math.max(0, this.sanitizeInt(src.actualSets)),
            actualReps: Math.max(0, this.sanitizeInt(src.actualReps)),
            actualWeightKg: Math.max(0, this.sanitizeFloat(src.actualWeightKg)),
            done: Boolean(src.done),
            notes: typeof src.notes === 'string' ? src.notes : '',
          };
        }
      }
    } catch {
      // ignore
    }
  }

  private clearLocalDraft(): void {
    if (!this.sessionId) return;
    try {
      localStorage.removeItem(this.localKey(this.sessionId));
    } catch {
      // ignore
    }
  }

  private resetRuntime(): void {
    this.executionId = null;
    this.executionStatus = null;
    this.startedAt = null;
    this.completedAt = null;
    this.initActualFromPlan();
  }

  // -------------------------
  // Utilities
  // -------------------------

  private sanitizeInt(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    const i = Math.trunc(n);
    return i < 0 ? 0 : i;
  }

  private sanitizeFloat(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    const x = n < 0 ? 0 : n;
    return Math.round(x * 10) / 10;
  }

  private showToast(type: 'success' | 'error' | 'info', text: string): void {
    this.toast = { type, text };
    window.setTimeout(() => (this.toast = null), 2800);
  }

  private humanError(err: HttpErrorResponse, fallback: string): string {
    const detail =
      err?.error?.detail ||
      err?.error?.message ||
      (typeof err?.error === 'string' ? err.error : null) ||
      err?.message ||
      fallback;

    return detail;
  }
}