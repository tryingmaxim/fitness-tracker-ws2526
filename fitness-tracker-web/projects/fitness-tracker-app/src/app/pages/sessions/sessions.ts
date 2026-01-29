import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { AuthSessionService } from '../../services/auth-session.service';
import { SessionsApiService } from './sessions-api.service';
import {
  CreateTrainingSessionRequest,
  ExecutionDraft,
  ExecutionRequest,
  Exercise,
  PlannedExerciseResponse,
  TrainingPlan,
  TrainingSession,
  UpdateTrainingSessionRequest,
} from './sessions.models';

const DAY_RANGE = { MIN: 1, MAX: 30 } as const;

const DEFAULT_EXECUTION_VALUES = {
  SETS: 3,
  REPS: 10,
  WEIGHT_KG: 0,
} as const;

const VALIDATION_LIMITS = {
  ORDER_INDEX_MIN: 1,
  ORDER_INDEX_MAX: 999,
  SETS_MIN: 1,
  SETS_MAX: 99,
  REPS_MIN: 1,
  REPS_MAX: 999,
  WEIGHT_MIN: 0,
  WEIGHT_MAX: 9999,
} as const;

const ORDER_INDEX_SHIFT = 1000;

type SessionFormState = {
  planId: number | null;
  name: string;
  days: number[];
};

type DetailOriginalState = {
  id: number | null;
  name: string;
  planId: number | null;
  daysKey: string;
};

type ExecutionSyncPlan = {
  toCreate: ExecutionDraft[];
  toDelete: ExecutionDraft[];
  toUpdate: ExecutionDraft[];
  hasOrderChangeForExisting: boolean;
};

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions implements OnInit {
  plans: TrainingPlan[] = [];
  sessions: TrainingSession[] = [];
  exercises: Exercise[] = [];

  filteredExercises: Exercise[] = [];
  availableDetailExercises: Exercise[] = [];

  selectedSession: TrainingSession | null = null;

  readonly dayOptions: number[] = Array.from({ length: DAY_RANGE.MAX }, (_, index) => index + 1);

  sessionSearch = '';
  exerciseSearch = '';
  detailExerciseSearch = '';

  selectedExecutions: ExecutionDraft[] = [];
  detailExecutions: ExecutionDraft[] = [];

  loadingPlans = false;
  loadingSessions = false;
  loadingExercises = false;

  creating = false;
  detailLoading = false;
  updating = false;

  deleting = false;
  deleteId: number | null = null;

  errorMsg = '';
  infoMsg = '';

  form: SessionFormState = this.createEmptyFormState();
  detailForm: SessionFormState & { id: number | null } = { id: null, ...this.createEmptyFormState() };

  private detailOriginal: DetailOriginalState | null = null;
  private detailOriginalExecutions: ExecutionDraft[] = [];

  constructor(
    private readonly apiService: SessionsApiService,
    private readonly sessionService: AuthSessionService
  ) {}

  get isLoggedIn(): boolean {
    return this.sessionService.isLoggedIn();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  get filteredSessionsForOverview(): TrainingSession[] {
    const term = this.normalizeSearchTerm(this.sessionSearch);
    if (!term) return this.sessions;

    return this.sessions.filter((session) => this.normalizeSearchTerm(session.name).includes(term));
  }

  trackBySession = (_: number, session: TrainingSession): string | number =>
    session.id ?? `${session.name}-${this.formatDays(session.days)}`;

  trackByExercise = (_: number, exercise: Exercise): number => exercise.id;

  formatDays(days: number[] | null | undefined): string {
    const normalizedDays = this.normalizeDays(days);
    return normalizedDays.length ? normalizedDays.join(', ') : '-';
  }

  joinExerciseNames(session: TrainingSession): string {
    const names = this.getExerciseNamesFromSession(session);
    return names.length ? names.join(', ') : 'Keine Übungen hinterlegt';
  }

  getPlanName(planId: number | null, fallback?: string): string {
    if (fallback) return fallback;

    const plan = this.plans.find((p) => p.id === planId);
    return plan?.name ?? '-';
  }

  onExerciseSearchChange(): void {
    this.filteredExercises = this.filterExercises(this.exercises, this.exerciseSearch);
  }

  onDetailExerciseSearchChange(): void {
    this.availableDetailExercises = this.computeAvailableDetailExercises();
  }

  clearDaysCreate(): void {
    this.form.days = [];
  }

  clearDaysDetail(): void {
    this.detailForm.days = [];
  }

  isDaySelectedCreate(day: number): boolean {
    return this.form.days.includes(day);
  }

  isDaySelectedDetail(day: number): boolean {
    return this.detailForm.days.includes(day);
  }

  isDayBlockedCreate(day: number): boolean {
    const usedDays = this.getUsedDaysForPlan(this.form.planId, null);
    return usedDays.has(day) && !this.isDaySelectedCreate(day);
  }

  isDayBlockedDetail(day: number): boolean {
    const usedDays = this.getUsedDaysForPlan(this.detailForm.planId, this.detailForm.id);
    return usedDays.has(day) && !this.isDaySelectedDetail(day);
  }

  toggleDayCreate(day: number): void {
    if (!this.isDayInRange(day) || this.isDayBlockedCreate(day)) return;
    this.form.days = this.toggleDayInList(this.form.days, day);
  }

  toggleDayDetail(day: number): void {
    if (!this.isDayInRange(day)) return;
    if (!this.isDaySelectedDetail(day) && this.isDayBlockedDetail(day)) return;

    this.detailForm.days = this.toggleDayInList(this.detailForm.days, day);
  }

  onDetailPlanChange(): void {
    const planId = this.detailForm.planId;
    if (!planId) return;

    const usedDays = this.getUsedDaysForPlan(planId, this.detailForm.id);
    const removedDays = this.removeBlockedDaysFromDetailForm(usedDays);

    if (removedDays.length) {
      this.setInfo(
        `Einige Tage wurden entfernt, weil sie im gewählten Plan schon belegt sind: ${removedDays.join(', ')}`
      );
    }
  }

  getExerciseName(exerciseId: number): string {
    return this.exercises.find((e) => e.id === exerciseId)?.name ?? `Übung #${exerciseId}`;
  }

  toggleExercise(exercise: Exercise): void {
    const isAlreadySelected = this.selectedExecutions.some((draft) => draft.exerciseId === exercise.id);
    this.selectedExecutions = isAlreadySelected
      ? this.selectedExecutions.filter((draft) => draft.exerciseId !== exercise.id)
      : [...this.selectedExecutions, this.createDefaultDraft(exercise.id, this.nextOrderIndex(this.selectedExecutions))];
  }

  isExerciseSelected(exercise: Exercise): boolean {
    return this.selectedExecutions.some((draft) => draft.exerciseId === exercise.id);
  }

  removeExecutionDraftCreate(exerciseId: number): void {
    this.selectedExecutions = this.selectedExecutions.filter((draft) => draft.exerciseId !== exerciseId);
  }

  addExerciseToDetail(exercise: Exercise): void {
    if (this.detailExecutions.some((draft) => draft.exerciseId === exercise.id)) {
      this.resetDetailExerciseSearch();
      return;
    }

    this.detailExecutions = [
      ...this.detailExecutions,
      this.createDefaultDraft(exercise.id, this.nextOrderIndex(this.detailExecutions)),
    ];

    this.resetDetailExerciseSearch();
  }

  removeExecutionDraftDetail(exerciseId: number): void {
    this.detailExecutions = this.detailExecutions.filter((draft) => draft.exerciseId !== exerciseId);
    this.availableDetailExercises = this.computeAvailableDetailExercises();
  }

  moveCreateUp(index: number): void {
    this.selectedExecutions = this.moveItemAndResequence(this.selectedExecutions, index, -1);
  }

  moveCreateDown(index: number): void {
    this.selectedExecutions = this.moveItemAndResequence(this.selectedExecutions, index, 1);
  }

  moveDetailUp(index: number): void {
    this.detailExecutions = this.moveItemAndResequence(this.detailExecutions, index, -1);
  }

  moveDetailDown(index: number): void {
    this.detailExecutions = this.moveItemAndResequence(this.detailExecutions, index, 1);
  }

  add(): void {
    if (!this.assertLoggedIn('Bitte anmelden, um Sessions anzulegen.')) return;

    this.clearMessages();

    const validationError = this.validateCreateForm();
    if (validationError) return this.setError(validationError);

    const payload = this.buildCreateSessionPayload();
    const blockedDay = this.findBlockedDay(payload.planId, payload.days, null);
    if (blockedDay != null) return this.setError(`Tag ${blockedDay} ist in diesem Plan bereits durch eine andere Session belegt.`);

    this.creating = true;

    this.apiService.createSession(payload).subscribe({
      next: (created) => this.createExecutionsForNewSession(created.id),
      error: (err) => this.handleAuthorizationOrGenericError(err, 'Session konnte nicht angelegt werden.', () => (this.creating = false)),
    });
  }

  selectSession(session: TrainingSession): void {
    if (session.id == null) return;

    this.selectedSession = session;
    this.detailLoading = true;
    this.clearMessages();

    this.initializeDetailForm(session);

    this.apiService.getExecutions(Number(session.id)).subscribe({
      next: (executions) => this.applyLoadedExecutions(executions),
      error: () => {
        this.setError('Details zur Session konnten nicht geladen werden.');
        this.detailLoading = false;
      },
    });
  }

  clearSelection(): void {
    this.selectedSession = null;
    this.detailExecutions = [];
    this.detailOriginalExecutions = [];
    this.detailForm = { id: null, ...this.createEmptyFormState() };
    this.detailOriginal = null;
    this.detailExerciseSearch = '';
    this.availableDetailExercises = [];
    this.detailLoading = false;
    this.updating = false;
  }

  updateSelectedSession(): void {
    if (!this.assertLoggedIn('Bitte anmelden, um Sessions zu bearbeiten.')) return;

    const sessionId = this.detailForm.id;
    if (!sessionId) return;

    this.clearMessages();

    const validationError = this.validateDetailForm();
    if (validationError) return this.setError(validationError);

    const payload = this.buildUpdatePayload();
    const executionsChanged = !this.areDraftListsEqual(this.detailExecutions, this.detailOriginalExecutions);

    if (!Object.keys(payload).length && !executionsChanged) {
      return this.setInfo('Keine Änderungen zum Speichern.');
    }

    const executionErrors = this.detailExecutions.flatMap((draft) => this.validateDraft(draft));
    if (executionErrors.length) return this.setError(executionErrors.join('\n'));

    this.updating = true;

    this.updateSessionThenSyncExecutions(sessionId, payload).subscribe({
      next: () => this.syncDetailExecutions(sessionId),
      error: (err) =>
        this.handleAuthorizationOrGenericError(err, 'Session konnte nicht aktualisiert werden.', () => (this.updating = false)),
    });
  }

  deleteSession(session: TrainingSession, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!session.id) return;

    if (!this.assertLoggedIn('Bitte anmelden, um Sessions zu löschen.')) return;
    if (!window.confirm(`Möchtest du die Session "${session.name}" wirklich löschen?`)) return;

    this.clearMessages();
    this.deleting = true;
    this.deleteId = Number(session.id);

    this.apiService.deleteSession(Number(session.id)).subscribe({
      next: () => this.afterDeleteSuccess(Number(session.id)),
      error: (err) =>
        this.handleAuthorizationOrGenericError(err, 'Session konnte nicht gelöscht werden.', () => {
          this.deleting = false;
          this.deleteId = null;
        }),
    });
  }

  private loadInitialData(): void {
    this.setLoadingState(true);

    forkJoin({
      plans: this.apiService.getPlans(),
      sessions: this.apiService.getSessions(),
      exercises: this.apiService.getExercises(),
    }).subscribe({
      next: ({ plans, sessions, exercises }) => this.applyInitialData(plans, sessions, exercises),
      error: () => this.setLoadingState(false),
    });
  }

  private applyInitialData(plans: TrainingPlan[], sessions: TrainingSession[], exercises: Exercise[]): void {
    this.plans = plans;
    this.sessions = sessions;
    this.exercises = exercises;

    this.filteredExercises = this.filterExercises(this.exercises, this.exerciseSearch);
    this.availableDetailExercises = this.computeAvailableDetailExercises();

    this.loadExecutionsForSessions();
    this.setLoadingState(false);
  }

  private setLoadingState(isLoading: boolean): void {
    this.loadingPlans = isLoading;
    this.loadingSessions = isLoading;
    this.loadingExercises = isLoading;
  }

  private loadExecutionsForSessions(): void {
    const sessionIds = this.sessions.map((s) => s.id).filter((id): id is number => Number.isFinite(id));
    if (!sessionIds.length) return;

    this.apiService.getExecutionsForSessions(sessionIds).subscribe({
      next: (results) => {
        this.sessions = this.sessions.map((session, index) => ({
          ...session,
          exerciseExecutions: results[index] ?? [],
        }));
      },
      error: () => {
        this.setError('Übungen zu Sessions konnten nicht geladen werden.');
      },
    });
  }

  private buildCreateSessionPayload(): CreateTrainingSessionRequest {
    return {
      planId: Number(this.form.planId),
      name: this.form.name.trim(),
      days: this.normalizeDays(this.form.days),
    };
  }

  private createExecutionsForNewSession(sessionId: number): void {
    if (!sessionId || !this.selectedExecutions.length) {
      return this.afterCreateSuccess();
    }

    const validationErrors = this.selectedExecutions.flatMap((draft) => this.validateDraft(draft));
    if (validationErrors.length) {
      this.creating = false;
      return this.setError(validationErrors.join('\n'));
    }

    const normalizedDrafts = this.normalizeAndResequenceDrafts(this.selectedExecutions);
    const requests = normalizedDrafts.map((draft) => this.apiService.createExecution(sessionId, this.toExecutionRequest(draft)));

    forkJoin(requests).subscribe({
      next: () => this.afterCreateSuccess(),
      error: (err) =>
        this.handleAuthorizationOrGenericError(
          err,
          'Session wurde angelegt, aber Übungen konnten nicht zugeordnet werden.',
          () => {
            this.creating = false;
            this.reloadSessionsAfterPartialFailure();
          }
        ),
    });
  }

  private reloadSessionsAfterPartialFailure(): void {
    this.apiService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loadExecutionsForSessions();
      },
      error: () => {
        this.setError('Sessions konnten nach Fehler nicht neu geladen werden.');
      },
    });
  }

  private afterCreateSuccess(): void {
    this.setInfo('Session wurde hinzugefügt.');
    this.form = this.createEmptyFormState();
    this.selectedExecutions = [];
    this.exerciseSearch = '';
    this.filteredExercises = this.filterExercises(this.exercises, this.exerciseSearch);

    this.creating = false;

    this.apiService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loadExecutionsForSessions();
      },
      error: () => {
        this.setError('Sessions konnten nicht neu geladen werden.');
      },
    });

    this.apiService.getPlans().subscribe({
      next: (plans) => (this.plans = plans),
      error: () => {
        this.setError('Trainingspläne konnten nicht neu geladen werden.');
      },
    });
  }

  private applyLoadedExecutions(executions: PlannedExerciseResponse[]): void {
    this.detailExecutions = this.mapExecutionResponsesToDrafts(executions);
    this.detailOriginalExecutions = this.cloneDrafts(this.detailExecutions);
    this.resetDetailExerciseSearch();
    this.detailLoading = false;
  }

  private updateSessionThenSyncExecutions(
    sessionId: number,
    payload: UpdateTrainingSessionRequest
  ): Observable<void> {
    if (!Object.keys(payload).length) return of(void 0);
    return this.apiService.updateSession(sessionId, payload);
  }

  private afterDeleteSuccess(deletedSessionId: number): void {
    this.deleting = false;
    this.deleteId = null;

    this.setInfo('Session wurde gelöscht.');
    this.sessions = this.sessions.filter((s) => Number(s.id) !== deletedSessionId);

    if (this.selectedSession?.id && Number(this.selectedSession.id) === deletedSessionId) {
      this.clearSelection();
    }
  }

  private validateCreateForm(): string | null {
    const name = this.form.name.trim();
    const planId = this.form.planId;
    const days = this.normalizeDays(this.form.days);

    if (!planId || !name || !days.length) {
      return 'Bitte Plan, Name und mindestens einen Tag (1-30) angeben.';
    }
    return null;
  }

  private validateDetailForm(): string | null {
    const name = this.detailForm.name.trim();
    const planId = this.detailForm.planId;

    if (!planId || !name) return 'Bitte Name und Plan angeben.';

    const days = this.normalizeDays(this.detailForm.days);
    const original = this.detailOriginal;

    const daysChanged = Boolean(original && original.daysKey !== this.makeDaysKey(days));
    if (daysChanged && !days.length) return 'Bitte mindestens einen Tag (1-30) auswählen.';

    if (daysChanged) {
      const blockedDay = this.findBlockedDay(planId, days, this.detailForm.id);
      if (blockedDay != null) return `Tag ${blockedDay} ist in diesem Plan bereits durch eine andere Session belegt.`;
    }

    return null;
  }

  private buildUpdatePayload(): UpdateTrainingSessionRequest {
    const original = this.detailOriginal;
    const payload: UpdateTrainingSessionRequest = {};

    const name = this.detailForm.name.trim();
    const planId = this.detailForm.planId;
    const days = this.normalizeDays(this.detailForm.days);

    if (!original || original.name !== name) payload.name = name;
    if (!original || original.planId !== planId) payload.planId = planId ?? undefined;

    const daysKeyNow = this.makeDaysKey(days);
    if (!original || original.daysKey !== daysKeyNow) payload.days = days;

    return payload;
  }

  private syncDetailExecutions(sessionId: number): void {
    const normalizedCurrent = this.normalizeAndResequenceDrafts(this.detailExecutions);
    const syncPlan = this.buildExecutionSyncPlan(normalizedCurrent, this.detailOriginalExecutions);

    const requests$ = syncPlan.hasOrderChangeForExisting
      ? this.runShiftThenFinalRequests(sessionId, normalizedCurrent, syncPlan)
      : this.runFinalExecutionRequests(sessionId, normalizedCurrent, syncPlan);

    requests$.subscribe({
      next: () => this.afterUpdateSuccess(),
      error: (err) => {
        this.updating = false;
        this.setError(this.formatShiftOrSaveError(err, 'Übungen konnten nicht gespeichert werden.'));
      },
    });
  }

  private buildExecutionSyncPlan(current: ExecutionDraft[], original: ExecutionDraft[]): ExecutionSyncPlan {
    const toCreate = current.filter((d) => !d.executionId);
    const toDelete = original.filter((o) => !current.find((d) => d.executionId === o.executionId));
    const toUpdate = current.filter((d) => this.hasDraftChanged(d, original));
    const hasOrderChangeForExisting = toUpdate.some((d) => this.hasOrderChanged(d, original));

    return { toCreate, toDelete, toUpdate, hasOrderChangeForExisting };
  }

  private runShiftThenFinalRequests(
    sessionId: number,
    normalizedCurrent: ExecutionDraft[],
    plan: ExecutionSyncPlan
  ): Observable<unknown> {
    const existing = normalizedCurrent.filter((d) => Boolean(d.executionId));
    const shiftRequests = existing.map((draft) =>
      this.apiService.updateExecution(sessionId, Number(draft.executionId), this.toShiftedExecutionRequest(draft))
    );

    if (!shiftRequests.length) {
      this.detailExecutions = normalizedCurrent;
      return this.runFinalExecutionRequests(sessionId, normalizedCurrent, plan);
    }

    return forkJoin(shiftRequests).pipe(
      tap(() => {
        this.detailExecutions = normalizedCurrent;
      }),
      switchMap(() => this.runFinalExecutionRequests(sessionId, normalizedCurrent, plan))
    );
  }

  private toShiftedExecutionRequest(draft: ExecutionDraft): ExecutionRequest {
    return { ...this.toExecutionRequest(draft), orderIndex: draft.orderIndex + ORDER_INDEX_SHIFT };
  }

  private runFinalExecutionRequests(
    sessionId: number,
    normalizedCurrent: ExecutionDraft[],
    plan: ExecutionSyncPlan
  ): Observable<unknown> {
    this.detailExecutions = normalizedCurrent;

    const createRequests = plan.toCreate.map((draft) =>
      this.apiService.createExecution(sessionId, this.toExecutionRequest(draft))
    );

    const updateRequests = plan.toUpdate
      .filter((draft) => Number.isFinite(Number(draft.executionId)))
      .map((draft) =>
        this.apiService.updateExecution(sessionId, Number(draft.executionId), this.toExecutionRequest(draft))
      );

    const deleteRequests = plan.toDelete
      .filter((draft) => Number.isFinite(Number(draft.executionId)))
      .map((draft) => this.apiService.deleteExecution(sessionId, Number(draft.executionId)));

    const allRequests = [...createRequests, ...updateRequests, ...deleteRequests];
    if (!allRequests.length) return of(true);

    return forkJoin(allRequests).pipe(map(() => true));
  }

  private formatShiftOrSaveError(err: unknown, fallbackMessage: string): string {
    const anyErr = err as { status?: number; error?: any } | null;

    if (anyErr?.status === 401 || anyErr?.status === 403) return 'Nicht berechtigt. Bitte erneut anmelden.';

    const status = anyErr?.status;
    const detail =
      anyErr?.error?.detail ||
      anyErr?.error?.message ||
      (typeof anyErr?.error === 'string' ? anyErr.error : '');

    const prefix = status ? `Status: ${status}` : 'Status: unbekannt';
    const message = detail ? `${prefix} – Detail: ${detail}` : prefix;

    return `${fallbackMessage} ${message}`;
  }

  private afterUpdateSuccess(): void {
    this.updating = false;
    this.setInfo('Session wurde vollständig aktualisiert.');
    this.clearSelection();

    this.apiService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loadExecutionsForSessions();
      },
      error: () => {
        this.setError('Sessions konnten nach Update nicht neu geladen werden.');
      },
    });
  }

  private initializeDetailForm(session: TrainingSession): void {
    const id = Number(session.id);
    const planId = session.planId != null ? Number(session.planId) : null;

    this.detailForm = {
      id,
      name: session.name,
      days: this.normalizeDays(session.days),
      planId,
    };

    this.detailOriginal = {
      id,
      name: String(session.name ?? ''),
      planId,
      daysKey: this.makeDaysKey(this.detailForm.days),
    };
  }

  private mapExecutionResponsesToDrafts(executions: PlannedExerciseResponse[] | null | undefined): ExecutionDraft[] {
    const drafts = (executions ?? [])
      .map((response) => this.mapExecutionResponseToDraft(response))
      .filter((draft): draft is ExecutionDraft => draft != null)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return this.normalizeAndResequenceDrafts(drafts);
  }

  private mapExecutionResponseToDraft(response: PlannedExerciseResponse): ExecutionDraft | null {
    const exerciseId = Number(response.exerciseId ?? response.exercise?.id);
    if (!Number.isFinite(exerciseId)) return null;

    return this.normalizeDraft({
      executionId: Number(response.id),
      exerciseId,
      orderIndex: Number(response.orderIndex) || 1,
      plannedSets: Number(response.plannedSets) || DEFAULT_EXECUTION_VALUES.SETS,
      plannedReps: Number(response.plannedReps) || DEFAULT_EXECUTION_VALUES.REPS,
      plannedWeightKg: Number(response.plannedWeightKg) || DEFAULT_EXECUTION_VALUES.WEIGHT_KG,
      notes: response.notes ?? null,
    });
  }

  private toExecutionRequest(draft: ExecutionDraft): ExecutionRequest {
    return {
      exerciseId: draft.exerciseId,
      orderIndex: draft.orderIndex,
      plannedSets: draft.plannedSets,
      plannedReps: draft.plannedReps,
      plannedWeightKg: draft.plannedWeightKg,
      notes: draft.notes,
    };
  }

  private computeAvailableDetailExercises(): Exercise[] {
    const term = this.normalizeSearchTerm(this.detailExerciseSearch);
    const usedExerciseIds = new Set(this.detailExecutions.map((draft) => draft.exerciseId));

    return this.exercises
      .filter((exercise) => !usedExerciseIds.has(exercise.id))
      .filter((exercise) => !term || this.normalizeSearchTerm(exercise.name).includes(term));
  }

  private filterExercises(exercises: Exercise[], search: string): Exercise[] {
    const term = this.normalizeSearchTerm(search);
    if (!term) return [...exercises];

    return exercises.filter((exercise) => this.normalizeSearchTerm(exercise.name).includes(term));
  }

  private getExerciseNamesFromSession(session: TrainingSession): string[] {
    const fromExecutions = (session.exerciseExecutions ?? [])
      .map((execution: any) => (execution?.exerciseName ?? execution?.exercise?.name ?? '').toString().trim())
      .filter(Boolean);

    if (fromExecutions.length) return fromExecutions;

    return (session.exerciseNames ?? []).map((x) => (x ?? '').toString().trim()).filter(Boolean);
  }

  private getUsedDaysForPlan(planId: number | null, excludeSessionId?: number | null): Set<number> {
    const usedDays = new Set<number>();
    if (!planId) return usedDays;

    const excludedId = excludeSessionId != null ? Number(excludeSessionId) : null;

    this.sessions.forEach((session) => {
      const sessionPlanId = session.planId != null ? Number(session.planId) : null;
      const sessionId = session.id != null ? Number(session.id) : null;

      if (sessionPlanId !== Number(planId)) return;
      if (excludedId != null && sessionId === excludedId) return;

      (session.days ?? []).forEach((dayValue) => {
        const day = Number(dayValue);
        if (Number.isFinite(day)) usedDays.add(day);
      });
    });

    return usedDays;
  }

  private findBlockedDay(planId: number, days: number[], excludeSessionId: number | null): number | null {
    const usedDays = this.getUsedDaysForPlan(planId, excludeSessionId);
    const blocked = days.find((day) => usedDays.has(day));
    return blocked ?? null;
  }

  private removeBlockedDaysFromDetailForm(usedDays: Set<number>): number[] {
    const before = [...this.detailForm.days];
    const after = before.filter((day) => !usedDays.has(day));

    this.detailForm.days = this.normalizeDays(after);

    return before.filter((day) => usedDays.has(day)).sort((a, b) => a - b);
  }

  private resetDetailExerciseSearch(): void {
    this.detailExerciseSearch = '';
    this.availableDetailExercises = this.computeAvailableDetailExercises();
  }

  private isDayInRange(day: number): boolean {
    return day >= DAY_RANGE.MIN && day <= DAY_RANGE.MAX;
  }

  private toggleDayInList(days: number[], day: number): number[] {
    const set = new Set(this.normalizeDays(days));
    if (set.has(day)) set.delete(day);
    else set.add(day);

    return [...set].sort((a, b) => a - b);
  }

  private normalizeDays(days: number[] | null | undefined): number[] {
    return [...(days ?? [])]
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= DAY_RANGE.MIN && d <= DAY_RANGE.MAX)
      .sort((a, b) => a - b);
  }

  private normalizeSearchTerm(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private createEmptyFormState(): SessionFormState {
    return { planId: null, name: '', days: [] };
  }

  private createDefaultDraft(exerciseId: number, orderIndex: number): ExecutionDraft {
    return {
      executionId: null,
      exerciseId,
      orderIndex,
      plannedSets: DEFAULT_EXECUTION_VALUES.SETS,
      plannedReps: DEFAULT_EXECUTION_VALUES.REPS,
      plannedWeightKg: DEFAULT_EXECUTION_VALUES.WEIGHT_KG,
      notes: null,
    };
  }

  private nextOrderIndex(list: ExecutionDraft[]): number {
    const maxOrderIndex = list.reduce((max, draft) => Math.max(max, Number(draft.orderIndex) || 0), 0);
    return Math.max(1, maxOrderIndex + 1);
  }

  private moveItemAndResequence(list: ExecutionDraft[], index: number, direction: -1 | 1): ExecutionDraft[] {
    const newIndex = index + direction;
    if (index < 0 || index >= list.length) return list;
    if (newIndex < 0 || newIndex >= list.length) return list;

    const copy = [...list];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];

    return this.resequencePreservingCurrentOrder(copy);
  }

  private resequencePreservingCurrentOrder(list: ExecutionDraft[]): ExecutionDraft[] {
    const normalized = list.map((draft) => this.normalizeDraft(draft));
    return normalized.map((draft, idx) => ({ ...draft, orderIndex: idx + 1 }));
  }

  private validateDraft(draft: ExecutionDraft): string[] {
    const errors: string[] = [];
    const exerciseName = this.getExerciseName(Number(draft.exerciseId));

    if (!this.isStrictPositiveIntInput(draft.orderIndex) || Number(draft.orderIndex) < VALIDATION_LIMITS.ORDER_INDEX_MIN) {
      errors.push(`${exerciseName}: Reihenfolge (Priorität) muss eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }

    if (!this.isStrictPositiveIntInput(draft.plannedSets) || Number(draft.plannedSets) < VALIDATION_LIMITS.SETS_MIN) {
      errors.push(`${exerciseName}: Sätze müssen eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }

    if (!this.isStrictPositiveIntInput(draft.plannedReps) || Number(draft.plannedReps) < VALIDATION_LIMITS.REPS_MIN) {
      errors.push(`${exerciseName}: Wiederholungen müssen eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }

    const weight = Number(String(draft.plannedWeightKg).replace(',', '.'));
    if (!this.isStrictNonNegativeNumberInput(draft.plannedWeightKg) || weight < VALIDATION_LIMITS.WEIGHT_MIN) {
      errors.push(`${exerciseName}: Gewicht (kg) muss eine Zahl ≥ 0 sein (ohne Sonderzeichen).`);
    }

    return errors;
  }

  private normalizeDraft(draft: ExecutionDraft): ExecutionDraft {
    const weight = Number(String(draft.plannedWeightKg ?? 0).replace(',', '.'));
    const notes = (draft.notes ?? '').toString().trim();

    return {
      executionId: draft.executionId ?? null,
      exerciseId: Number(draft.exerciseId),
      orderIndex: this.clampInt(draft.orderIndex, VALIDATION_LIMITS.ORDER_INDEX_MIN, VALIDATION_LIMITS.ORDER_INDEX_MAX),
      plannedSets: this.clampInt(draft.plannedSets, VALIDATION_LIMITS.SETS_MIN, VALIDATION_LIMITS.SETS_MAX),
      plannedReps: this.clampInt(draft.plannedReps, VALIDATION_LIMITS.REPS_MIN, VALIDATION_LIMITS.REPS_MAX),
      plannedWeightKg: this.clampFloat(weight, VALIDATION_LIMITS.WEIGHT_MIN, VALIDATION_LIMITS.WEIGHT_MAX),
      notes: notes ? notes : null,
    };
  }

  private normalizeAndResequenceDrafts(list: ExecutionDraft[]): ExecutionDraft[] {
    const normalized = list.map((d) => this.normalizeDraft(d)).sort((a, b) => a.orderIndex - b.orderIndex);
    return normalized.map((draft, idx) => ({ ...draft, orderIndex: idx + 1 }));
  }

  private clampInt(value: unknown, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  private clampFloat(value: unknown, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  private isStrictPositiveIntInput(value: unknown): boolean {
    const s = (value ?? '').toString();
    return /^\d+$/.test(s);
  }

  private isStrictNonNegativeNumberInput(value: unknown): boolean {
    const s = (value ?? '').toString();
    return /^\d+(?:[.,]\d+)?$/.test(s);
  }

  private makeDaysKey(days: number[]): string {
    return this.normalizeDays(days).join(',');
  }

  private cloneDrafts(list: ExecutionDraft[]): ExecutionDraft[] {
    return JSON.parse(JSON.stringify(list)) as ExecutionDraft[];
  }

  private areDraftListsEqual(a: ExecutionDraft[], b: ExecutionDraft[]): boolean {
    if (a.length !== b.length) return false;

    const aSorted = [...a].sort((x, y) => (x.executionId ?? 0) - (y.executionId ?? 0));
    const bSorted = [...b].sort((x, y) => (x.executionId ?? 0) - (y.executionId ?? 0));

    for (let i = 0; i < aSorted.length; i += 1) {
      if (!this.areDraftsEqual(aSorted[i], bSorted[i])) return false;
    }

    return true;
  }

  private areDraftsEqual(a: ExecutionDraft, b: ExecutionDraft): boolean {
    return (
      (a.executionId ?? null) === (b.executionId ?? null) &&
      a.exerciseId === b.exerciseId &&
      a.orderIndex === b.orderIndex &&
      a.plannedSets === b.plannedSets &&
      a.plannedReps === b.plannedReps &&
      a.plannedWeightKg === b.plannedWeightKg &&
      (a.notes ?? null) === (b.notes ?? null)
    );
  }

  private hasDraftChanged(current: ExecutionDraft, originalList: ExecutionDraft[]): boolean {
    if (!current.executionId) return false;

    const original = originalList.find((o) => o.executionId === current.executionId);
    if (!original) return true;

    return !this.areDraftsEqual(current, original);
  }

  private hasOrderChanged(current: ExecutionDraft, originalList: ExecutionDraft[]): boolean {
    if (!current.executionId) return false;

    const original = originalList.find((o) => o.executionId === current.executionId);
    if (!original) return true;

    return Number(original.orderIndex) !== Number(current.orderIndex);
  }

  private clearMessages(): void {
    this.errorMsg = '';
    this.infoMsg = '';
  }

  private setError(message: string): void {
    this.errorMsg = message;
    this.infoMsg = '';
  }

  private setInfo(message: string): void {
    this.infoMsg = message;
    this.errorMsg = '';
  }

  private assertLoggedIn(messageIfNotLoggedIn: string): boolean {
    if (this.isLoggedIn) return true;
    this.setError(messageIfNotLoggedIn);
    return false;
  }

  private handleAuthorizationOrGenericError(err: any, fallbackMessage: string, onFinally: () => void): void {
    onFinally();

    if (err?.status === 401 || err?.status === 403) {
      this.setError('Nicht berechtigt. Bitte erneut anmelden.');
      return;
    }

    const backendMessage = err?.error?.detail || err?.error?.message;
    this.setError(backendMessage ? String(backendMessage) : fallbackMessage);
  }
}
