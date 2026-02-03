import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environment';

type UiState = 'loading' | 'ready' | 'error';

interface PlannedExerciseFromSession {
  id: number;
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

interface TrainingExecutionResponse {
  id: number;
  sessionId: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  completedAt: string | null;
  executedExercises: ExecutedExerciseResponse[];
}

interface ActualEntry {
  exerciseId: number;
  actualSets: number;
  actualReps: number;
  actualWeightKg: number;
  done: boolean;
  notes: string;
}

type FieldKey = 'sets' | 'reps' | 'weight';
type FieldType = 'int' | 'float';

interface ActualInputEntry {
  sets: string;
  reps: string;
  weight: string;
}

interface FieldErrors {
  sets?: string;
  reps?: string;
  weight?: string;
}

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  type: ToastType;
  text: string;
}

@Component({
  selector: 'app-training-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './training-start.html',
  styleUrl: './training-start.css',
})
export class TrainingStart implements OnInit, OnDestroy {
  private static readonly MAX_DAYS = 30;
  private static readonly MIN_SETS_REPS = 1;
  private static readonly MIN_WEIGHT = 0;
  private static readonly TOAST_TIMEOUT_MS = 2800;

  private static readonly MSG_INVALID_SESSION_ID = 'Ungültige Session-ID in der URL.';
  private static readonly MSG_SESSION_LOAD_FAILED = 'Session konnte nicht geladen werden.';
  private static readonly MSG_NO_EXERCISES = 'Diese Session hat noch keine Übungen. Bitte zuerst Übungen hinzufügen.';
  private static readonly MSG_ALREADY_IN_PROGRESS = 'Training läuft bereits.';
  private static readonly MSG_ALREADY_COMPLETED = 'Dieses Training ist bereits abgeschlossen.';
  private static readonly MSG_FIX_INPUTS = 'Bitte korrigiere die Eingaben (nur gültige Zahlen).';
  private static readonly MSG_STARTED = 'Training gestartet.';
  private static readonly MSG_START_FAILED = 'Training konnte nicht gestartet werden.';
  private static readonly MSG_START_REQUIRED = 'Bitte starte zuerst das Training.';
  private static readonly MSG_SAVE_INVALID = 'Speichern nicht möglich: Bitte korrigiere die rot markierten Felder.';
  private static readonly MSG_SAVED = 'Fortschritt gespeichert';
  private static readonly MSG_SAVE_FAILED = 'Speichern fehlgeschlagen.';
  private static readonly MSG_FINISH_NOT_IN_PROGRESS = 'Training ist nicht im Status IN_PROGRESS.';
  private static readonly MSG_FINISH_INVALID = 'Abschließen nicht möglich: Bitte korrigiere die rot markierten Felder.';
  private static readonly MSG_FINISHED = 'Training abgeschlossen';
  private static readonly MSG_FINISH_FAILED = 'Abschließen fehlgeschlagen.';
  private static readonly MSG_DRAFT_DISCARDED = 'Entwurf verworfen.';
  private static readonly MSG_CANCELED = 'Training abgebrochen und gelöscht.';
  private static readonly MSG_CANCEL_FAILED = 'Abbrechen fehlgeschlagen.';

  private static readonly ALLOWED_CONTROL_KEYS = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
  ];

  private readonly baseUrl = environment.apiBaseUrl;

  state: UiState = 'loading';
  errorMessage = '';

  sessionId: number | null = null;
  session: TrainingSessionResponse | null = null;

  executionId: number | null = null;
  executionStatus: 'IN_PROGRESS' | 'COMPLETED' | null = null;
  startedAt: Date | null = null;
  completedAt: Date | null = null;

  actual: Record<number, ActualEntry> = {};
  actualInput: Record<number, ActualInputEntry> = {};
  errors: Record<number, FieldErrors> = {};

  toast: ToastState | null = null;

  starting = false;
  saving = false;
  finishing = false;

  private subscription = new Subscription();
  private isStorageHealthy = true;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.subscription.add(
      this.route.paramMap
        .pipe(
          switchMap((params) => {
            const sessionId = this.parseSessionId(params.get('sessionId'));
            if (sessionId == null) {
              this.setErrorState(TrainingStart.MSG_INVALID_SESSION_ID);
              return of(null);
            }

            this.sessionId = sessionId;
            this.state = 'loading';
            this.errorMessage = '';

            return this.http.get<TrainingSessionResponse>(`${this.baseUrl}/training-sessions/${sessionId}`).pipe(
              catchError((err: HttpErrorResponse) => {
                this.setErrorState(this.humanError(err, TrainingStart.MSG_SESSION_LOAD_FAILED));
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

          if (this.executionId) {
            this.loadExecution(this.executionId);
            return;
          }

          this.state = 'ready';
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  startTraining(): void {
    if (!this.session || this.sessionId == null) return;

    if (!this.session.exerciseExecutions?.length) {
      this.showToast('error', TrainingStart.MSG_NO_EXERCISES);
      return;
    }

    if (this.executionStatus === 'IN_PROGRESS') {
      this.showToast('info', TrainingStart.MSG_ALREADY_IN_PROGRESS);
      return;
    }

    if (this.executionStatus === 'COMPLETED') {
      this.showToast('error', TrainingStart.MSG_ALREADY_COMPLETED);
      return;
    }

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', TrainingStart.MSG_FIX_INPUTS);
      return;
    }

    this.starting = true;

    this.http
      .post<TrainingExecutionResponse>(`${this.baseUrl}/training-executions`, { sessionId: this.sessionId })
      .subscribe({
        next: (trainingExecution) => {
          this.applyExecution(trainingExecution);
          this.persistLocalDraft();
          this.state = 'ready';
          this.showToast('success', TrainingStart.MSG_STARTED);
          this.starting = false;
        },
        error: (err: HttpErrorResponse) => {
          this.showToast('error', this.humanError(err, TrainingStart.MSG_START_FAILED));
          this.starting = false;
        },
      });
  }

  saveProgress(): void {
    if (!this.session || this.sessionId == null) return;

    if (!this.executionId || this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', TrainingStart.MSG_START_REQUIRED);
      return;
    }

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', TrainingStart.MSG_SAVE_INVALID);
      return;
    }

    this.saving = true;

    const requests = this.session.exerciseExecutions.map((planned) =>
      this.saveExerciseProgress(planned.exerciseId)
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.loadExecutionAndThen(() => {
          this.persistLocalDraft();
          this.showToast('success', TrainingStart.MSG_SAVED);
          this.saving = false;
        });
      },
      error: (err: HttpErrorResponse) => {
        this.persistLocalDraft();
        this.showToast('error', this.humanError(err, TrainingStart.MSG_SAVE_FAILED));
        this.saving = false;
      },
    });
  }

  finishTraining(): void {
    if (!this.executionId) {
      this.showToast('error', TrainingStart.MSG_START_REQUIRED);
      return;
    }

    if (this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', TrainingStart.MSG_FINISH_NOT_IN_PROGRESS);
      return;
    }

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', TrainingStart.MSG_FINISH_INVALID);
      return;
    }

    this.finishing = true;

    const saveRequests =
      this.session?.exerciseExecutions?.map((planned) => this.saveExerciseProgress(planned.exerciseId)) ?? [];

    const saveAll$ = saveRequests.length ? forkJoin(saveRequests) : of([]);

    saveAll$
      .pipe(
        switchMap(() =>
          this.http.post<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${this.executionId}/complete`, {})
        )
      )
      .subscribe({
        next: () => {
          this.loadExecutionAndThen(() => {
            this.clearLocalDraft();
            this.showToast('success', TrainingStart.MSG_FINISHED);
            this.finishing = false;
          });
        },
        error: (err: HttpErrorResponse) => {
          this.persistLocalDraft();
          this.showToast('error', this.humanError(err, TrainingStart.MSG_FINISH_FAILED));
          this.finishing = false;
        },
      });
  }

  cancelTraining(): void {
    if (!this.executionId) {
      this.clearLocalDraft();
      this.resetRuntime();
      this.showToast('info', TrainingStart.MSG_DRAFT_DISCARDED);
      return;
    }

    this.http.delete(`${this.baseUrl}/training-executions/${this.executionId}`).subscribe({
      next: () => {
        this.clearLocalDraft();
        this.resetRuntime();
        this.showToast('info', TrainingStart.MSG_CANCELED);
      },
      error: (err: HttpErrorResponse) => {
        this.showToast('error', this.humanError(err, TrainingStart.MSG_CANCEL_FAILED));
      },
    });
  }

  onRawInputChange(exerciseId: number, field: FieldKey, value: string): void {
    this.ensureInputState(exerciseId);

    this.actualInput[exerciseId][field] = (value ?? '').toString();
    this.validateAndApply(exerciseId, field);
    this.persistLocalDraft();
  }

  onNumberKeyDown(event: KeyboardEvent, type: FieldType): void {
    if (TrainingStart.ALLOWED_CONTROL_KEYS.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey) return;

    if (event.key === '-' || event.key === '+' || event.key.toLowerCase() === 'e') {
      event.preventDefault();
      return;
    }

    if (type === 'int') {
      if (!/^\d$/.test(event.key)) event.preventDefault();
      return;
    }

    if (/^\d$/.test(event.key)) return;

    if (event.key === '.' || event.key === ',') {
      const input = event.target as HTMLInputElement | null;
      const currentValue = input?.value ?? '';
      if (currentValue.includes('.') || currentValue.includes(',')) {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
  }

  onNumberPaste(event: ClipboardEvent, type: FieldType): void {
    const text = (event.clipboardData?.getData('text') ?? '').trim();
    const isValid = type === 'int' ? /^\d+$/.test(text) : /^\d+([.,]\d+)?$/.test(text);

    if (!isValid) {
      event.preventDefault();
    }
  }

  get isInProgress(): boolean {
    return this.executionStatus === 'IN_PROGRESS';
  }

  get isCompleted(): boolean {
    return this.executionStatus === 'COMPLETED';
  }

  get doneCount(): number {
    return Object.values(this.actual).filter((entry) => entry.done).length;
  }

  get totalCount(): number {
    return this.session?.exerciseExecutions?.length ?? 0;
  }

  get percent(): number {
    const total = this.totalCount;
    if (!total) return 0;
    return Math.round((this.doneCount / total) * 100);
  }

  onToggleDone(exerciseId: number, checked: boolean): void {
    const entry = this.actual[exerciseId];
    if (!entry) return;

    entry.done = checked;
    this.persistLocalDraft();
  }

  onNotesChange(exerciseId: number): void {
    const entry = this.actual[exerciseId];
    if (!entry) return;

    entry.notes = (entry.notes ?? '').toString();
    this.persistLocalDraft();
  }

  private saveExerciseProgress(exerciseId: number) {
    const entry = this.actual[exerciseId];

    const body = {
      exerciseId,
      actualSets: this.clampIntMin(entry?.actualSets, TrainingStart.MIN_SETS_REPS),
      actualReps: this.clampIntMin(entry?.actualReps, TrainingStart.MIN_SETS_REPS),
      actualWeightKg: this.clampFloatMin(entry?.actualWeightKg, TrainingStart.MIN_WEIGHT),
      done: Boolean(entry?.done ?? false),
      notes: (entry?.notes ?? '').trim() || null,
    };

    return this.http.put<TrainingExecutionResponse>(
      `${this.baseUrl}/training-executions/${this.executionId}/exercises`,
      body
    );
  }

  private loadExecutionAndThen(action: () => void): void {
    if (!this.executionId) {
      action();
      return;
    }

    this.http.get<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${this.executionId}`).subscribe({
      next: (trainingExecution) => {
        this.applyExecution(trainingExecution);
        action();
      },
      error: () => {
        action();
      },
    });
  }

  private loadExecution(executionId: number): void {
    this.http.get<TrainingExecutionResponse>(`${this.baseUrl}/training-executions/${executionId}`).subscribe({
      next: (trainingExecution) => {
        this.applyExecution(trainingExecution);
        this.state = 'ready';
      },
      error: () => {
        this.resetExecutionMeta();
        this.persistLocalDraft();
        this.state = 'ready';
      },
    });
  }

  private applyExecution(trainingExecution: TrainingExecutionResponse): void {
    this.executionId = trainingExecution.id ?? null;
    this.executionStatus = trainingExecution.status ?? null;
    this.startedAt = trainingExecution.startedAt ? new Date(trainingExecution.startedAt) : null;
    this.completedAt = trainingExecution.completedAt ? new Date(trainingExecution.completedAt) : null;

    if (!Array.isArray(trainingExecution.executedExercises)) return;

    for (const executed of trainingExecution.executedExercises) {
      const exerciseId = Number(executed.exerciseId);
      if (!Number.isFinite(exerciseId)) continue;

      this.ensureEntryState(exerciseId);

      const entry = this.actual[exerciseId];
      entry.actualSets = this.clampIntMin(Number(executed.actualSets ?? TrainingStart.MIN_SETS_REPS), TrainingStart.MIN_SETS_REPS);
      entry.actualReps = this.clampIntMin(Number(executed.actualReps ?? TrainingStart.MIN_SETS_REPS), TrainingStart.MIN_SETS_REPS);
      entry.actualWeightKg = this.clampFloatMin(Number(executed.actualWeightKg ?? TrainingStart.MIN_WEIGHT), TrainingStart.MIN_WEIGHT);
      entry.done = Boolean(executed.done);
      entry.notes = (executed.notes ?? '') || '';

      this.actualInput[exerciseId].sets = String(entry.actualSets);
      this.actualInput[exerciseId].reps = String(entry.actualReps);
      this.actualInput[exerciseId].weight = this.formatWeight(entry.actualWeightKg);

      this.errors[exerciseId] = {};
    }
  }

  private initActualFromPlan(): void {
    if (!this.session) return;

    const nextActual: Record<number, ActualEntry> = {};
    const nextInput: Record<number, ActualInputEntry> = {};
    const nextErrors: Record<number, FieldErrors> = {};

    for (const planned of this.session.exerciseExecutions) {
      const exerciseId = planned.exerciseId;

      nextActual[exerciseId] = {
        exerciseId,
        actualSets: TrainingStart.MIN_SETS_REPS,
        actualReps: TrainingStart.MIN_SETS_REPS,
        actualWeightKg: TrainingStart.MIN_WEIGHT,
        done: false,
        notes: '',
      };

      nextInput[exerciseId] = {
        sets: String(TrainingStart.MIN_SETS_REPS),
        reps: String(TrainingStart.MIN_SETS_REPS),
        weight: String(TrainingStart.MIN_WEIGHT),
      };

      nextErrors[exerciseId] = {};
    }

    this.actual = nextActual;
    this.actualInput = nextInput;
    this.errors = nextErrors;
  }

  private normalizeSession(session: TrainingSessionResponse): TrainingSessionResponse {
    return {
      ...session,
      days: Array.isArray(session.days) ? session.days : [],
      exerciseExecutions: Array.isArray(session.exerciseExecutions)
        ? [...session.exerciseExecutions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [],
    };
  }

  private parseSessionId(raw: string | null): number | null {
    const id = raw ? Number(raw) : NaN;
    if (!raw || Number.isNaN(id)) return null;
    return id;
  }

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
      actualInput: this.actualInput,
      errors: this.errors,
    };

    this.safeStorageWrite(() => localStorage.setItem(this.localKey(this.sessionId as number), JSON.stringify(payload)));
  }

  private restoreLocalDraft(): void {
    if (!this.sessionId) return;

    const raw = this.safeStorageRead(() => localStorage.getItem(this.localKey(this.sessionId as number)));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId !== this.sessionId) return;

      this.executionId = parsed.executionId ?? null;
      this.executionStatus = parsed.executionStatus ?? null;

      this.startedAt = parsed.startedAt ? new Date(parsed.startedAt) : null;
      this.completedAt = parsed.completedAt ? new Date(parsed.completedAt) : null;

      this.restoreActual(parsed?.actual);
      this.restoreActualInput(parsed?.actualInput);
      this.restoreErrors(parsed?.errors);

      this.validateAllFields();
    } catch {
      this.isStorageHealthy = false;
    }
  }

  private restoreActual(rawActual: any): void {
    if (!rawActual || typeof rawActual !== 'object') return;

    for (const key of Object.keys(rawActual)) {
      const exerciseId = Number(key);
      if (!this.actual[exerciseId]) continue;

      const src = rawActual[key];

      this.actual[exerciseId] = {
        exerciseId,
        actualSets: this.clampIntMin(Number(src?.actualSets ?? TrainingStart.MIN_SETS_REPS), TrainingStart.MIN_SETS_REPS),
        actualReps: this.clampIntMin(Number(src?.actualReps ?? TrainingStart.MIN_SETS_REPS), TrainingStart.MIN_SETS_REPS),
        actualWeightKg: this.clampFloatMin(Number(src?.actualWeightKg ?? TrainingStart.MIN_WEIGHT), TrainingStart.MIN_WEIGHT),
        done: Boolean(src?.done),
        notes: typeof src?.notes === 'string' ? src.notes : '',
      };
    }
  }

  private restoreActualInput(rawInput: any): void {
    if (!rawInput || typeof rawInput !== 'object') {
      this.rebuildActualInputFromActual();
      return;
    }

    for (const key of Object.keys(rawInput)) {
      const exerciseId = Number(key);
      if (!this.actualInput[exerciseId]) continue;

      const src = rawInput[key];
      this.actualInput[exerciseId] = {
        sets: typeof src?.sets === 'string' ? src.sets : String(this.actual[exerciseId].actualSets),
        reps: typeof src?.reps === 'string' ? src.reps : String(this.actual[exerciseId].actualReps),
        weight: typeof src?.weight === 'string' ? src.weight : this.formatWeight(this.actual[exerciseId].actualWeightKg),
      };
    }
  }

  private restoreErrors(rawErrors: any): void {
    if (!rawErrors || typeof rawErrors !== 'object') return;
    this.errors = rawErrors;
  }

  private rebuildActualInputFromActual(): void {
    for (const exerciseIdStr of Object.keys(this.actual)) {
      const exerciseId = Number(exerciseIdStr);

      if (!this.actualInput[exerciseId]) {
        this.actualInput[exerciseId] = {
          sets: String(this.actual[exerciseId].actualSets),
          reps: String(this.actual[exerciseId].actualReps),
          weight: this.formatWeight(this.actual[exerciseId].actualWeightKg),
        };
      }
    }
  }

  private clearLocalDraft(): void {
    if (!this.sessionId) return;
    this.safeStorageWrite(() => localStorage.removeItem(this.localKey(this.sessionId as number)));
  }

  private resetRuntime(): void {
    this.resetExecutionMeta();
    this.initActualFromPlan();
  }

  private resetExecutionMeta(): void {
    this.executionId = null;
    this.executionStatus = null;
    this.startedAt = null;
    this.completedAt = null;
  }

  private validateAllFields(): void {
    if (!this.session) return;

    for (const planned of this.session.exerciseExecutions) {
      const exerciseId = planned.exerciseId;
      this.validateAndApply(exerciseId, 'sets');
      this.validateAndApply(exerciseId, 'reps');
      this.validateAndApply(exerciseId, 'weight');
    }
  }

  private validateAndApply(exerciseId: number, field: FieldKey): void {
    this.ensureEntryState(exerciseId);

    const raw = (this.actualInput[exerciseId][field] ?? '').toString().trim();

    if (!raw) {
      this.errors[exerciseId][field] = field === 'weight' ? 'Bitte eine Zahl ≥ 0 eingeben.' : 'Bitte eine ganze Zahl ≥ 1 eingeben.';
      return;
    }

    if (field === 'sets' || field === 'reps') {
      this.applyIntField(exerciseId, field, raw);
      return;
    }

    this.applyFloatField(exerciseId, raw);
  }

  private applyIntField(exerciseId: number, field: 'sets' | 'reps', raw: string): void {
    if (!/^\d+$/.test(raw)) {
      this.errors[exerciseId][field] = 'Nur ganze Zahlen ohne Sonderzeichen (≥ 1).';
      return;
    }

    const numberValue = Number(raw);
    if (!Number.isFinite(numberValue) || numberValue < TrainingStart.MIN_SETS_REPS) {
      this.errors[exerciseId][field] = 'Muss mindestens 1 sein.';
      return;
    }

    this.errors[exerciseId][field] = undefined;

    const intValue = Math.trunc(numberValue);
    if (field === 'sets') this.actual[exerciseId].actualSets = intValue;
    if (field === 'reps') this.actual[exerciseId].actualReps = intValue;
  }

  private applyFloatField(exerciseId: number, raw: string): void {
    if (!/^\d+([.,]\d+)?$/.test(raw)) {
      this.errors[exerciseId].weight = 'Nur Zahlen (z.B. 20 oder 20,5). Keine Sonderzeichen.';
      return;
    }

    const normalized = raw.replace(',', '.');
    const numberValue = Number(normalized);

    if (!Number.isFinite(numberValue) || numberValue < TrainingStart.MIN_WEIGHT) {
      this.errors[exerciseId].weight = 'Muss mindestens 0 sein.';
      return;
    }

    this.errors[exerciseId].weight = undefined;
    this.actual[exerciseId].actualWeightKg = this.roundToTenth(numberValue);
  }

  private hasValidationErrors(): boolean {
    for (const exerciseIdStr of Object.keys(this.errors)) {
      const e = this.errors[Number(exerciseIdStr)];
      if (!e) continue;
      if (e.sets || e.reps || e.weight) return true;
    }
    return false;
  }

  private clampIntMin(value: unknown, min: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;

    const i = Math.trunc(n);
    return i < min ? min : i;
  }

  private clampFloatMin(value: unknown, min: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return n < min ? min : this.roundToTenth(n);
  }

  private roundToTenth(n: number): number {
    return Math.round(n * 10) / 10;
  }

  private formatWeight(n: number): string {
    return Number.isFinite(n) ? String(this.roundToTenth(n)) : String(TrainingStart.MIN_WEIGHT);
  }

  private showToast(type: ToastType, text: string): void {
    this.toast = { type, text };
    window.setTimeout(() => {
      this.toast = null;
    }, TrainingStart.TOAST_TIMEOUT_MS);
  }

  private humanError(err: HttpErrorResponse, fallback: string): string {
    const detail =
      (err as any)?.error?.detail ||
      (err as any)?.error?.message ||
      (typeof (err as any)?.error === 'string' ? (err as any).error : null) ||
      err?.message ||
      fallback;

    return detail;
  }

  private setErrorState(message: string): void {
    this.state = 'error';
    this.errorMessage = message;
  }

  private ensureEntryState(exerciseId: number): void {
    if (!this.actual[exerciseId]) {
      this.actual[exerciseId] = {
        exerciseId,
        actualSets: TrainingStart.MIN_SETS_REPS,
        actualReps: TrainingStart.MIN_SETS_REPS,
        actualWeightKg: TrainingStart.MIN_WEIGHT,
        done: false,
        notes: '',
      };
    }

    this.ensureInputState(exerciseId);

    if (!this.errors[exerciseId]) {
      this.errors[exerciseId] = {};
    }
  }

  private ensureInputState(exerciseId: number): void {
    if (!this.actualInput[exerciseId]) {
      this.actualInput[exerciseId] = {
        sets: String(TrainingStart.MIN_SETS_REPS),
        reps: String(TrainingStart.MIN_SETS_REPS),
        weight: String(TrainingStart.MIN_WEIGHT),
      };
    }
  }

  private safeStorageRead<T>(fn: () => T): T | null {
    try {
      return fn();
    } catch {
      this.isStorageHealthy = false;
      return null;
    }
  }

  private safeStorageWrite(fn: () => void): void {
    try {
      fn();
    } catch {
      this.isStorageHealthy = false;
    }
  }
}
