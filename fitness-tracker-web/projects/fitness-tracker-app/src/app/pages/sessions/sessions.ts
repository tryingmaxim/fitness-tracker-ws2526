import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';
import { forkJoin } from 'rxjs';
import { AuthSessionService } from '../../services/auth-session.service';

interface TrainingPlan {
  id: number;
  name: string;
  description?: string;
}

interface PlannedExerciseResponse {
  id: number;
  exerciseId?: number;
  exerciseName?: string;

  exercise?: {
    id: number;
    name: string;
    category?: string | null;
    muscleGroups?: string | null;
  };

  category?: string | null;
  muscleGroups?: string | null;
  orderIndex?: number | null;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeightKg?: number | null;
  notes?: string | null;
}

interface TrainingSession {
  id?: number;
  name: string;
  days: number[];
  planId: number | null;
  planName?: string;

  exerciseExecutions?: PlannedExerciseResponse[];
  exerciseNames?: string[];
}

interface Exercise {
  id: number;
  name: string;
  category?: string;
  muscleGroups?: string;
}

interface ExecutionDraft {
  executionId?: number | null;
  exerciseId: number;
  orderIndex: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
  notes: string | null;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions implements OnInit {
  private readonly baseUrl = environment.apiBaseUrl;

  plans: TrainingPlan[] = [];
  sessions: TrainingSession[] = [];

  readonly dayOptions: number[] = Array.from({ length: 30 }, (_, i) => i + 1);

  private readonly defaultPlannedSets = 3;
  private readonly defaultPlannedReps = 10;
  private readonly defaultPlannedWeightKg = 0;

  form = {
    planId: null as number | null,
    name: '',
    days: [] as number[],
  };

  detailForm = {
    id: null as number | null,
    planId: null as number | null,
    name: '',
    days: [] as number[],
  };

  private detailOriginal: {
    id: number | null;
    name: string;
    planId: number | null;
    daysKey: string;
  } | null = null;

  selectedSession: TrainingSession | null = null;

  sessionSearch = '';

  exercises: Exercise[] = [];
  filteredExercises: Exercise[] = [];
  exerciseSearch = '';

  selectedExecutions: ExecutionDraft[] = [];
  detailExecutions: ExecutionDraft[] = [];

  detailOriginalExecutions: ExecutionDraft[] = [];

  detailExerciseSearch = '';

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

  constructor(private http: HttpClient, private session: AuthSessionService) {}

  // Sprint 4: UI/Logik "eingeloggt"
  get isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  ngOnInit(): void {
    this.loadPlans();
    this.loadSessions();
    this.loadExercises();
  }

  //Suche nach Sessions
  get filteredSessionsForOverview(): TrainingSession[] {
    const term = this.sessionSearch.trim().toLowerCase();
    if (!term) return this.sessions;
    return this.sessions.filter((s) => (s.name ?? '').toLowerCase().includes(term));
  }

  trackBySession = (_: number, session: TrainingSession) =>
    session.id ?? `${session.name}-${this.formatDays(session.days)}`;

  formatDays(days: number[] | null | undefined): string {
    if (!days || !days.length) return '-';
    return [...days]
      .filter((d) => typeof d === 'number')
      .sort((a, b) => a - b)
      .join(', ');
  }

  //Übungsnamen aus ExerciseExecution ableiten
  getExerciseExecution(session: TrainingSession): string[] {
    const fromExecutions = (session.exerciseExecutions ?? [])
      .map((e: any) => (e?.exerciseName ?? e?.exercise?.name ?? '').toString().trim())
      .filter(Boolean);

    if (fromExecutions.length) return fromExecutions;

    return (session.exerciseNames ?? []).map((x) => (x ?? '').toString().trim()).filter(Boolean);
  }

  joinExerciseNames(session: TrainingSession): string {
    const names = this.getExerciseExecution(session);
    return names.length ? names.join(', ') : 'Keine Übungen hinterlegt';
  }

  getPlanName(planId: number | null, fallback?: string): string {
    if (fallback) return fallback;
    const plan = this.plans.find((p) => p.id === planId);
    return plan?.name ?? '-';
  }

  //Sammelt alle Tage die in einem Trainingsplan schon belegt sind
  private getUsedDaysForPlan(planId: number | null, excludeSessionId?: number | null): Set<number> {
    const used = new Set<number>();
    if (!planId) return used;

    const exclude = excludeSessionId != null ? Number(excludeSessionId) : null;

    this.sessions.forEach((s) => {
      const sPlanId = s.planId != null ? Number(s.planId) : null;
      const sId = s.id != null ? Number(s.id) : null;

      if (sPlanId !== Number(planId)) return;
      if (exclude != null && sId === exclude) return;

      (s.days ?? []).forEach((d) => {
        const day = Number(d);
        if (Number.isFinite(day)) used.add(day);
      });
    });

    return used;
  }

  isDaySelectedCreate(day: number): boolean {
    return Array.isArray(this.form.days) && this.form.days.some((d) => Number(d) === day);
  }

  isDaySelectedDetail(day: number): boolean {
    return Array.isArray(this.detailForm.days) && this.detailForm.days.some((d) => Number(d) === day);
  }

  isDayBlockedCreate(day: number): boolean {
    const used = this.getUsedDaysForPlan(this.form.planId, null);
    const alreadySelected = this.isDaySelectedCreate(day);
    return used.has(day) && !alreadySelected;
  }

  isDayBlockedDetail(day: number): boolean {
    const excludeId = this.detailForm.id ?? null;
    const used = this.getUsedDaysForPlan(this.detailForm.planId, excludeId);
    const alreadySelected = this.isDaySelectedDetail(day);
    return used.has(day) && !alreadySelected;
  }

  toggleDayCreate(day: number): void {
    if (day < 1 || day > 30) return;
    if (this.isDayBlockedCreate(day)) return;

    if (!Array.isArray(this.form.days)) this.form.days = [];

    if (this.isDaySelectedCreate(day)) {
      this.form.days = this.form.days.filter((d) => Number(d) !== day);
    } else {
      this.form.days.push(day);
    }

    this.form.days = Array.from(new Set(this.form.days.map((d) => Number(d)))).sort((a, b) => a - b);
  }

  clearDaysCreate(): void {
    this.form.days = [];
  }

  toggleDayDetail(day: number): void {
    if (day < 1 || day > 30) return;
    if (!this.isDaySelectedDetail(day) && this.isDayBlockedDetail(day)) return;

    if (!Array.isArray(this.detailForm.days)) this.detailForm.days = [];

    if (this.isDaySelectedDetail(day)) {
      this.detailForm.days = this.detailForm.days.filter((d) => Number(d) !== day);
    } else {
      this.detailForm.days.push(day);
    }

    this.detailForm.days = Array.from(new Set(this.detailForm.days.map((d) => Number(d)))).sort((a, b) => a - b);
  }

  clearDaysDetail(): void {
    this.detailForm.days = [];
  }

  //Wenn im Detail der Plan geändert wird: remove blockierte Tage
  onDetailPlanChange(): void {
    const id = this.detailForm.id != null ? Number(this.detailForm.id) : null;
    const planId = this.detailForm.planId != null ? Number(this.detailForm.planId) : null;
    if (!planId) return;

    const used = this.getUsedDaysForPlan(planId, id);
    const before = Array.isArray(this.detailForm.days) ? [...this.detailForm.days] : [];
    const filtered = before.filter((d) => !used.has(Number(d)));
    const removed = before.filter((d) => used.has(Number(d)));

    this.detailForm.days = Array.from(new Set(filtered)).sort((a, b) => a - b);

    if (removed.length) {
      this.infoMsg = `Einige Tage wurden entfernt, weil sie im gewählten Plan schon belegt sind: ${removed
        .sort((a, b) => a - b)
        .join(', ')}`;
    }
  }

  //exercise Suche
  onExerciseSearchChange(): void {
    this.applyExerciseSearch();
  }

  private applyExerciseSearch(): void {
    const q = (this.exerciseSearch ?? '').toLowerCase().trim();
    if (!q) {
      this.filteredExercises = [...this.exercises];
      return;
    }
    this.filteredExercises = this.exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }

  //Detail: verfügbare Übungen
  getAvailableDetailExercises(): Exercise[] {
    const term = (this.detailExerciseSearch ?? '').toLowerCase().trim();
    const usedIds = new Set(this.detailExecutions.map((d) => d.exerciseId));

    return this.exercises
      .filter((e) => !usedIds.has(e.id))
      .filter((e) => !term || e.name.toLowerCase().includes(term));
  }

  private clampInt(val: any, min: number, max: number): number {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  private clampFloat(val: any, min: number, max: number): number {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  private isStrictPositiveIntInput(v: any): boolean {
    const s = (v ?? '').toString();
    return /^\d+$/.test(s);
  }

  private isStrictNonNegativeNumberInput(v: any): boolean {
    const s = (v ?? '').toString();
    return /^\d+(?:[.,]\d+)?$/.test(s);
  }

  private validateDraft(d: ExecutionDraft): string[] {
    const errors: string[] = [];
    const exName = this.getExerciseName(Number(d.exerciseId));

    if (!this.isStrictPositiveIntInput(d.orderIndex) || Number(d.orderIndex) < 1) {
      errors.push(`${exName}: Reihenfolge (Priorität) muss eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }
    if (!this.isStrictPositiveIntInput(d.plannedSets) || Number(d.plannedSets) < 1) {
      errors.push(`${exName}: Sätze müssen eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }
    if (!this.isStrictPositiveIntInput(d.plannedReps) || Number(d.plannedReps) < 1) {
      errors.push(`${exName}: Wiederholungen müssen eine ganze Zahl ≥ 1 sein (ohne Sonderzeichen).`);
    }
    if (
      !this.isStrictNonNegativeNumberInput(d.plannedWeightKg) ||
      Number(String(d.plannedWeightKg).replace(',', '.')) < 0
    ) {
      errors.push(`${exName}: Gewicht (kg) muss eine Zahl ≥ 0 sein (ohne Sonderzeichen).`);
    }

    return errors;
  }

  private normalizeDraft(d: ExecutionDraft): ExecutionDraft {
    const weight = Number(String(d.plannedWeightKg ?? 0).replace(',', '.'));

    return {
      executionId: d.executionId ?? null,
      exerciseId: Number(d.exerciseId),
      orderIndex: this.clampInt(d.orderIndex, 1, 999),
      plannedSets: this.clampInt(d.plannedSets, 1, 99),
      plannedReps: this.clampInt(d.plannedReps, 1, 999),
      plannedWeightKg: this.clampFloat(weight, 0, 9999),
      notes: (d.notes ?? '').toString().trim() ? (d.notes ?? '').toString() : null,
    };
  }

  private renumberAndSort(list: ExecutionDraft[]): ExecutionDraft[] {
    const sorted = [...list].sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));
    return sorted.map((d, idx) => ({ ...d, orderIndex: idx + 1 }));
  }

  private nextOrderIndex(list: ExecutionDraft[]): number {
    const max = list.reduce((m, x) => Math.max(m, Number(x.orderIndex) || 0), 0);
    return Math.max(1, max + 1);
  }

  getExerciseName(exerciseId: number): string {
    return this.exercises.find((e) => e.id === exerciseId)?.name ?? `Übung #${exerciseId}`;
  }

  toggleExercise(ex: Exercise): void {
    const idx = this.selectedExecutions.findIndex((d) => d.exerciseId === ex.id);
    if (idx >= 0) {
      this.selectedExecutions.splice(idx, 1);
      return;
    }

    this.selectedExecutions.push({
      executionId: null,
      exerciseId: ex.id,
      orderIndex: this.nextOrderIndex(this.selectedExecutions),
      plannedSets: this.defaultPlannedSets,
      plannedReps: this.defaultPlannedReps,
      plannedWeightKg: this.defaultPlannedWeightKg,
      notes: null,
    });
  }

  isExerciseSelected(ex: Exercise): boolean {
    return this.selectedExecutions.some((d) => d.exerciseId === ex.id);
  }

  removeExecutionDraftCreate(exerciseId: number): void {
    this.selectedExecutions = this.selectedExecutions.filter((d) => d.exerciseId !== exerciseId);
  }

  addExerciseToDetail(ex: Exercise): void {
    if (this.detailExecutions.some((d) => d.exerciseId === ex.id)) {
      this.detailExerciseSearch = '';
      return;
    }

    this.detailExecutions.push({
      executionId: null,
      exerciseId: ex.id,
      orderIndex: this.nextOrderIndex(this.detailExecutions),
      plannedSets: this.defaultPlannedSets,
      plannedReps: this.defaultPlannedReps,
      plannedWeightKg: this.defaultPlannedWeightKg,
      notes: null,
    });

    this.detailExerciseSearch = '';
  }

  removeExecutionDraftDetail(exerciseId: number): void {
    this.detailExecutions = this.detailExecutions.filter((d) => d.exerciseId !== exerciseId);
  }

  private resequenceInPlace(list: ExecutionDraft[]): void {
    list.forEach((d, i) => (d.orderIndex = i + 1));
  }

  private moveItem(list: ExecutionDraft[], index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (index < 0 || index >= list.length) return;
    if (newIndex < 0 || newIndex >= list.length) return;

    const tmp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = tmp;

    this.resequenceInPlace(list);
  }

  moveDetailUp(index: number): void {
    this.moveItem(this.detailExecutions, index, -1);
  }

  moveDetailDown(index: number): void {
    this.moveItem(this.detailExecutions, index, 1);
  }

  moveCreateUp(index: number): void {
    this.moveItem(this.selectedExecutions, index, -1);
  }

  moveCreateDown(index: number): void {
    this.moveItem(this.selectedExecutions, index, 1);
  }

  onDetailOrderEdited(): void {
    const sorted = [...this.detailExecutions].sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));
    this.detailExecutions = sorted;
    this.resequenceInPlace(this.detailExecutions);
  }

  onCreateOrderEdited(): void {
    const sorted = [...this.selectedExecutions].sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));
    this.selectedExecutions = sorted;
    this.resequenceInPlace(this.selectedExecutions);
  }

  // neue Session erstellen (nur mit Login)
  add(): void {
    if (!this.isLoggedIn) {
      this.errorMsg = 'Bitte anmelden, um Sessions anzulegen.';
      this.infoMsg = '';
      return;
    }

    this.errorMsg = '';
    this.infoMsg = '';

    const trimmedName = this.form.name?.trim();
    const normalizedDays = (this.form.days ?? [])
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 30);

    if (!trimmedName || !this.form.planId || !normalizedDays.length) {
      this.errorMsg = 'Bitte Plan, Name und mindestens einen Tag (1-30) angeben.';
      return;
    }

    const usedDays = this.getUsedDaysForPlan(this.form.planId, null);
    const blockedPicked = normalizedDays.find((d) => usedDays.has(d));
    if (blockedPicked) {
      this.errorMsg = `Tag ${blockedPicked} ist in diesem Plan bereits durch eine andere Session belegt.`;
      return;
    }

    const payload = {
      planId: Number(this.form.planId),
      name: trimmedName,
      days: Array.from(new Set(normalizedDays)).sort((a, b) => a - b),
    };

    this.creating = true;

    this.http.post<any>(`${this.baseUrl}/training-sessions`, payload).subscribe({
      next: (createdSession) => {
        const sessionId = Number(createdSession?.id);

        if (!sessionId || !this.selectedExecutions.length) {
          this.afterCreateSuccess();
          return;
        }

        const validationErrors = this.selectedExecutions.flatMap((d) => this.validateDraft(d));
        if (validationErrors.length) {
          this.creating = false;
          this.errorMsg = validationErrors.join('\n');
          return;
        }

        const drafts = this.renumberAndSort(this.selectedExecutions).map((d) => this.normalizeDraft(d));

        const requests = drafts.map((d) =>
          this.http.post(`${this.baseUrl}/training-sessions/${sessionId}/executions`, {
            exerciseId: d.exerciseId,
            orderIndex: d.orderIndex,
            plannedSets: d.plannedSets,
            plannedReps: d.plannedReps,
            plannedWeightKg: d.plannedWeightKg,
            notes: d.notes,
          })
        );

        forkJoin(requests).subscribe({
          next: () => this.afterCreateSuccess(),
          error: (err) => {
            console.error('Konnte ExerciseExecutions nicht anlegen', err);
            this.creating = false;
            if (err?.status === 401 || err?.status === 403) {
              this.errorMsg = 'Nicht berechtigt. Bitte erneut anmelden.';
            } else {
              this.errorMsg = 'Session wurde angelegt, aber Übungen konnten nicht zugeordnet werden.';
            }
            this.loadSessions();
          },
        });
      },
      error: (err) => {
        this.creating = false;
        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.errorMsg = err?.error?.detail || 'Session konnte nicht angelegt werden.';
        }
        console.error(err);
      },
    });
  }

  private afterCreateSuccess(): void {
    this.infoMsg = 'Session wurde hinzugefügt.';
    this.form.name = '';
    this.form.days = [];
    this.selectedExecutions = [];
    this.exerciseSearch = '';
    this.applyExerciseSearch();
    this.loadSessions();
    this.loadPlans();
    this.creating = false;
  }

  private makeDaysKey(days: number[]): string {
    return [...(days ?? [])]
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d))
      .sort((a, b) => a - b)
      .join(',');
  }

  selectSession(session: TrainingSession): void {
    if (session.id == null) return;

    this.selectedSession = session;
    this.detailLoading = true;
    this.errorMsg = '';
    this.infoMsg = '';

    const planId = session.planId != null ? Number(session.planId) : null;
    const id = Number(session.id);

    const daysArr = Array.isArray(session.days)
      ? session.days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 30)
      : [];

    this.detailForm = {
      id,
      name: session.name,
      days: [...daysArr].sort((a, b) => a - b),
      planId,
    };

    this.detailOriginal = {
      id,
      name: (session.name ?? '').toString(),
      planId,
      daysKey: this.makeDaysKey(daysArr),
    };

    this.http.get<any[]>(`${this.baseUrl}/training-sessions/${id}/executions`).subscribe({
      next: (execs) => {
        const normalized = (execs ?? [])
          .map((e: any): ExecutionDraft | null => {
            const exerciseId = Number(e.exerciseId ?? e.exercise?.id);
            if (!Number.isFinite(exerciseId)) return null;

            return this.normalizeDraft({
              executionId: Number(e.id),
              exerciseId,
              orderIndex: Number(e.orderIndex) || 1,
              plannedSets: Number(e.plannedSets) || this.defaultPlannedSets,
              plannedReps: Number(e.plannedReps) || this.defaultPlannedReps,
              plannedWeightKg: Number(e.plannedWeightKg) || this.defaultPlannedWeightKg,
              notes: e.notes ?? null,
            });
          })
          .filter((x): x is ExecutionDraft => x !== null)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        this.detailExecutions = normalized;
        this.detailOriginalExecutions = JSON.parse(JSON.stringify(normalized));
        this.detailExerciseSearch = '';
        this.detailLoading = false;
      },
      error: (err) => {
        console.error('Details konnten nicht geladen werden', err);
        this.errorMsg = 'Details zur Session konnten nicht geladen werden.';
        this.detailLoading = false;
      },
    });
  }

  clearSelection(): void {
    this.selectedSession = null;
    this.detailExecutions = [];
    this.detailOriginalExecutions = [];
    this.detailForm = { id: null, planId: null, name: '', days: [] };
    this.detailOriginal = null;
    this.detailExerciseSearch = '';
    this.detailLoading = false;
    this.updating = false;
  }

  // ausgewählte Session aktualisieren (nur mit Login)
  updateSelectedSession(): void {
    if (!this.isLoggedIn) {
      this.errorMsg = 'Bitte anmelden, um Sessions zu bearbeiten.';
      this.infoMsg = '';
      return;
    }

    if (!this.detailForm.id) return;

    const id = Number(this.detailForm.id);
    const trimmedName = (this.detailForm.name ?? '').trim();
    const planId = this.detailForm.planId != null ? Number(this.detailForm.planId) : null;

    const normalizedDays = (this.detailForm.days ?? [])
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 30);

    if (!trimmedName || !planId) {
      this.errorMsg = 'Bitte Name und Plan angeben.';
      return;
    }

    const original = this.detailOriginal;
    const daysKeyNow = this.makeDaysKey(normalizedDays);
    const daysChanged = !!original && original.daysKey !== daysKeyNow;

    if (daysChanged) {
      if (!normalizedDays.length) {
        this.errorMsg = 'Bitte mindestens einen Tag (1-30) auswählen.';
        return;
      }

      const usedDays = this.getUsedDaysForPlan(planId, id);
      const blockedPicked = normalizedDays.find((d) => usedDays.has(d));
      if (blockedPicked) {
        this.errorMsg = `Tag ${blockedPicked} ist in diesem Plan bereits durch eine andere Session belegt.`;
        return;
      }
    }

    const payload: any = {};
    if (!original || original.name !== trimmedName) payload.name = trimmedName;
    if (!original || original.planId !== planId) payload.planId = planId;
    if (daysChanged) payload.days = Array.from(new Set(normalizedDays)).sort((a, b) => a - b);

    const executionsChanged =
      JSON.stringify(this.detailExecutions) !== JSON.stringify(this.detailOriginalExecutions);

    if (!Object.keys(payload).length && !executionsChanged) {
      this.infoMsg = 'Keine Änderungen zum Speichern.';
      return;
    }

    this.errorMsg = '';
    this.infoMsg = '';
    this.updating = true;

    const execValidationErrors = this.detailExecutions.flatMap((d) => this.validateDraft(d));
    if (execValidationErrors.length) {
      this.errorMsg = execValidationErrors.join('\n');
      this.updating = false;
      return;
    }

    this.detailExecutions = this.renumberAndSort(this.detailExecutions).map((d) => this.normalizeDraft(d));

    if (!Object.keys(payload).length && executionsChanged) {
      this.syncDetailExecutions(id);
      return;
    }

    this.http.patch<any>(`${this.baseUrl}/training-sessions/${id}`, payload).subscribe({
      next: () => {
        this.syncDetailExecutions(id);
      },
      error: (err) => {
        console.error(err);
        this.updating = false;
        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.errorMsg = err?.error?.detail || err?.error?.message || 'Session konnte nicht aktualisiert werden.';
        }
      },
    });
  }

  private syncDetailExecutions(sessionId: number): void {
    this.detailExecutions = [...this.detailExecutions].map((d, idx) => ({
      ...d,
      orderIndex: idx + 1,
    }));

    const toCreate = this.detailExecutions.filter((d) => !d.executionId);

    const toDelete = this.detailOriginalExecutions.filter(
      (o) => !this.detailExecutions.find((d) => d.executionId === o.executionId)
    );

    const toUpdate = this.detailExecutions.filter((d) => {
      if (!d.executionId) return false;
      const orig = this.detailOriginalExecutions.find((o) => o.executionId === d.executionId);
      if (!orig) return true;
      return JSON.stringify(d) !== JSON.stringify(orig);
    });

    const createRequests = toCreate.map((d) =>
      this.http.post(`${this.baseUrl}/training-sessions/${sessionId}/executions`, {
        exerciseId: d.exerciseId,
        orderIndex: d.orderIndex,
        plannedSets: d.plannedSets,
        plannedReps: d.plannedReps,
        plannedWeightKg: d.plannedWeightKg,
        notes: d.notes,
      })
    );

    const deleteRequests = toDelete.map((d) =>
      this.http.delete(`${this.baseUrl}/training-sessions/${sessionId}/executions/${d.executionId}`)
    );

    const orderChangedForExisting = toUpdate.some((d) => {
      const orig = this.detailOriginalExecutions.find((o) => o.executionId === d.executionId);
      return !!orig && Number(orig.orderIndex) !== Number(d.orderIndex);
    });

    const runFinalUpdateRequests = () => {
      const updateRequests = toUpdate.map((d) =>
        this.http.patch(`${this.baseUrl}/training-sessions/${sessionId}/executions/${d.executionId}`, {
          exerciseId: d.exerciseId,
          orderIndex: d.orderIndex,
          plannedSets: d.plannedSets,
          plannedReps: d.plannedReps,
          plannedWeightKg: d.plannedWeightKg,
          notes: d.notes,
        })
      );

      const all = [...createRequests, ...updateRequests, ...deleteRequests];

      if (!all.length) {
        this.afterUpdateSuccess();
        return;
      }

      forkJoin(all).subscribe({
        next: () => this.afterUpdateSuccess(),
        error: (err) => {
          console.error(err);
          this.updating = false;
          if (err?.status === 401 || err?.status === 403) {
            this.errorMsg = 'Nicht berechtigt. Bitte erneut anmelden.';
          } else {
            this.errorMsg = 'Übungen konnten nicht gespeichert werden.';
          }
        },
      });
    };

    if (!orderChangedForExisting) {
      runFinalUpdateRequests();
      return;
    }

    const existing = this.detailExecutions.filter((d) => !!d.executionId);

    const tempShiftRequests = existing.map((d) =>
      this.http.patch(`${this.baseUrl}/training-sessions/${sessionId}/executions/${d.executionId}`, {
        orderIndex: Number(d.orderIndex) + 1000,
      })
    );

    forkJoin(tempShiftRequests).subscribe({
      next: () => runFinalUpdateRequests(),
      error: (err) => {
        console.error(err);
        this.updating = false;
        this.errorMsg = 'Reihenfolge konnte nicht vorbereitet werden (Prio-Shift fehlgeschlagen).';
      },
    });
  }

  private afterUpdateSuccess(): void {
    this.updating = false;
    this.infoMsg = 'Session wurde vollständig aktualisiert.';
    this.clearSelection();
    this.loadSessions();
  }

  // Session löschen (nur mit Login)
  deleteSession(session: TrainingSession, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!session.id) return;

    if (!this.isLoggedIn) {
      this.errorMsg = 'Bitte anmelden, um Sessions zu löschen.';
      this.infoMsg = '';
      return;
    }

    const confirmed = window.confirm(`Möchtest du die Session "${session.name}" wirklich löschen?`);
    if (!confirmed) return;

    this.errorMsg = '';
    this.infoMsg = '';
    this.deleting = true;
    this.deleteId = Number(session.id);

    this.http.delete(`${this.baseUrl}/training-sessions/${Number(session.id)}`).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteId = null;
        this.infoMsg = 'Session wurde gelöscht.';
        this.sessions = this.sessions.filter((s) => Number(s.id) !== Number(session.id));

        if (this.selectedSession?.id && Number(this.selectedSession.id) === Number(session.id)) {
          this.clearSelection();
        }
      },
      error: (err) => {
        console.error(err);
        this.deleting = false;
        this.deleteId = null;
        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.errorMsg = err?.error?.detail || 'Session konnte nicht gelöscht werden.';
        }
      },
    });
  }

  private loadPlans(): void {
    this.loadingPlans = true;
    this.http.get<any>(`${this.baseUrl}/training-plans?size=200`).subscribe({
      next: (res) => {
        const list = this.flattenCollection(res, 'trainingPlans');
        this.plans = (list ?? []).map((p: any) => ({
          id: Number(p.id),
          name: p.name,
          description: p.description,
        }));
        this.loadingPlans = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingPlans = false;
      },
    });
  }

  private loadSessions(): void {
    this.loadingSessions = true;

    this.http.get<any>(`${this.baseUrl}/training-sessions?size=200`).subscribe({
      next: (res) => {
        const list = this.flattenCollection(res, 'trainingSessions');

        this.sessions = (list ?? []).map((s: any) => ({
          id: Number(s.id),
          name: s.name,
          planId: s.planId != null ? Number(s.planId) : s.plan?.id != null ? Number(s.plan.id) : null,
          planName: s.planName ?? s.plan?.name,
          days: Array.isArray(s.days)
            ? s.days.map((d: any) => Number(d)).filter((d: number) => d >= 1 && d <= 30)
            : [],
          exerciseExecutions: [],
        }));

        const ids = this.sessions
          .map((s) => s.id)
          .filter((id): id is number => Number.isFinite(id));

        if (!ids.length) {
          this.loadingSessions = false;
          return;
        }

        const requests = ids.map((id) =>
          this.http.get<any[]>(`${this.baseUrl}/training-sessions/${id}/executions`)
        );

        forkJoin(requests).subscribe({
          next: (results) => {
            this.sessions = this.sessions.map((s, i) => ({
              ...s,
              exerciseExecutions: results[i] ?? [],
            }));
            this.loadingSessions = false;
          },
          error: () => {
            this.loadingSessions = false;
          },
        });
      },
      error: () => {
        this.loadingSessions = false;
      },
    });
  }

  private loadExercises(): void {
    this.loadingExercises = true;
    this.http.get<any>(`${this.baseUrl}/exercises?size=500`).subscribe({
      next: (res) => {
        const list = this.flattenCollection(res, 'exercises');
        this.exercises = (list ?? []).map((e: any) => ({
          id: Number(e.id),
          name: e.name,
          category: e.category,
          muscleGroups: e.muscleGroups,
        }));
        this.filteredExercises = [...this.exercises];
        this.applyExerciseSearch();
        this.loadingExercises = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingExercises = false;
      },
    });
  }

  private flattenCollection(res: any, embeddedKey: string): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?._embedded?.[embeddedKey])) return res._embedded[embeddedKey];
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }
}
