import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

interface ExerciseDto {
  id: number;
  name: string;
  description?: string;
}

interface ExerciseExecutionDto {
  id: number;
  orderIndex: number;
  notes?: string;
  exercise: ExerciseDto;
}

interface SessionDto {
  id: number;
  title?: string;
  name?: string;
  plannedDate?: string | Date;
  scheduledDate?: string | Date;
  days?: number[];
  exercisesCount?: number;
  exercises?: ExerciseDto[];
  exerciseExecutions?: ExerciseExecutionDto[];
  performedCount?: number;
  status?: string;
}

interface PlanDto {
  id: number;
  name: string;
  description?: string;
  sessions?: SessionDto[];
  sessionsCount?: number;
}

type UiPlan = PlanDto & {
  loadingSessions?: boolean;
  sessionsLoaded?: boolean;
  sessions?: SessionDto[];
};

type PlanFormModel = {
  name: string;
  desc: string;
};

type PlanPayload = {
  name: string;
  description: string;
};

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans.html',
  styleUrls: ['./plans.css'],
})
export class Plans implements OnInit {
  plans: UiPlan[] = [];
  selectedPlan: UiPlan | null = null;

  form: PlanFormModel = { name: '', desc: '' };
  editForm: PlanFormModel = { name: '', desc: '' };
  editErrors: { name?: string } = {};

  query = '';

  loading = false;
  submitting = false;
  saving = false;

  error: string | null = null;
  info: string | null = null;

  private readonly baseUrl = environment.apiBaseUrl;

  private static readonly LOAD_PLANS_ERROR_MESSAGE = 'Fehler beim Laden der Trainingspläne';
  private static readonly CREATE_PLAN_ERROR_MESSAGE = 'Fehler beim Erstellen des Trainingsplans';
  private static readonly UPDATE_PLAN_ERROR_MESSAGE = 'Aktualisieren des Trainingsplans ist fehlgeschlagen.';
  private static readonly CREATE_PLAN_SUCCESS_MESSAGE = 'Trainingsplan wurde erstellt.';
  private static readonly UPDATE_PLAN_SUCCESS_MESSAGE = 'Trainingsplan wurde erfolgreich aktualisiert.';
  private static readonly LOGIN_REQUIRED_CREATE_MESSAGE = 'Bitte anmelden, um Trainingspläne anzulegen.';
  private static readonly LOGIN_REQUIRED_UPDATE_MESSAGE = 'Bitte anmelden, um Trainingspläne zu bearbeiten.';
  private static readonly LOGIN_REQUIRED_DELETE_MESSAGE = 'Bitte anmelden, um Trainingspläne zu löschen.';
  private static readonly UNAUTHORIZED_MESSAGE = 'Nicht berechtigt. Bitte erneut anmelden.';
  private static readonly NAME_REQUIRED_MESSAGE = 'Bitte einen Namen für den Trainingsplan angeben.';
  private static readonly NAME_EMPTY_VALIDATION_MESSAGE = 'Der Name darf nicht leer sein.';

  constructor(
    private http: HttpClient,
    private session: AuthSessionService
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  get isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  get filteredPlans(): UiPlan[] {
    const searchTerm = (this.query || '').trim().toLowerCase();
    if (!searchTerm) return this.plans;

    return this.plans.filter((plan) => {
      const name = (plan.name || '').toLowerCase();
      const description = (plan.description || '').toLowerCase();
      const sessionsCount = String(plan.sessionsCount ?? '');
      return name.includes(searchTerm) || description.includes(searchTerm) || sessionsCount.includes(searchTerm);
    });
  }

  formatDays(days?: number[] | null): string {
    if (!days || !days.length) return '–';

    return [...days]
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 30)
      .sort((a, b) => a - b)
      .join(', ');
  }

  add(form?: NgForm): void {
    if (!this.isLoggedIn) {
      this.setError(Plans.LOGIN_REQUIRED_CREATE_MESSAGE);
      return;
    }

    const payload = this.buildPayloadFromForm(this.form);
    if (!payload) {
      this.setError(Plans.NAME_REQUIRED_MESSAGE);
      return;
    }

    this.submitting = true;
    this.clearMessages();

    this.http.post(`${this.baseUrl}/training-plans`, payload).subscribe({
      next: () => {
        this.info = Plans.CREATE_PLAN_SUCCESS_MESSAGE;
        this.submitting = false;
        this.resetCreateForm(form);
        this.loadPlans();
      },
      error: (err) => {
        this.setError(this.resolveWriteErrorMessage(err, Plans.CREATE_PLAN_ERROR_MESSAGE));
        this.submitting = false;
      },
    });
  }

  selectPlan(plan: UiPlan): void {
    const isSameSelection = this.selectedPlan?.id === plan.id;

    if (!isSameSelection) {
      this.selectedPlan = plan;
      this.editForm = { name: plan.name ?? '', desc: plan.description ?? '' };
      this.editErrors = {};
      this.clearMessages();
    }

    if (!plan.sessionsLoaded && !plan.loadingSessions) {
      this.loadSessions(plan);
    }
  }

  resetSelection(): void {
    this.selectedPlan = null;
    this.editForm = { name: '', desc: '' };
    this.editErrors = {};
  }

  saveSelected(): void {
    if (!this.isLoggedIn) {
      this.setError(Plans.LOGIN_REQUIRED_UPDATE_MESSAGE);
      return;
    }

    const selected = this.selectedPlan;
    if (!selected) return;

    const payload = this.buildPayloadFromForm(this.editForm);
    if (!payload) {
      this.editErrors = { name: Plans.NAME_EMPTY_VALIDATION_MESSAGE };
      return;
    }

    this.saving = true;
    this.clearMessages();

    this.http.put<PlanDto>(`${this.baseUrl}/training-plans/${selected.id}`, payload).subscribe({
      next: (updated) => {
        const updatedName = updated?.name ?? payload.name;
        const updatedDescription = updated?.description ?? payload.description;

        this.applyUpdatedPlanToState(selected.id, updatedName, updatedDescription);

        this.info = Plans.UPDATE_PLAN_SUCCESS_MESSAGE;
        this.saving = false;
      },
      error: (err) => {
        this.setError(this.resolveWriteErrorMessage(err, Plans.UPDATE_PLAN_ERROR_MESSAGE));
        this.saving = false;
      },
    });
  }

  delete(plan: UiPlan, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.isLoggedIn) {
      this.setError(Plans.LOGIN_REQUIRED_DELETE_MESSAGE);
      return;
    }

    if (!window.confirm(`Möchte Sie ${plan.name} wirklich löschen?`)) return;

    this.http.delete(`${this.baseUrl}/training-plans/${plan.id}`).subscribe({
      next: () => {
        if (this.selectedPlan?.id === plan.id) this.resetSelection();
        this.loadPlans();
      },
      error: (err) => {
        const status = Number(err?.status ?? 0);
        if (status === 401 || status === 403) {
          this.setError(Plans.UNAUTHORIZED_MESSAGE);
          return;
        }
        this.setError(`Fehler beim Löschen von ${plan.name}.`);
      },
    });
  }

  trackByPlan = (_: number, plan: UiPlan) => plan.id;
  trackBySession = (_: number, session: SessionDto) => session.id;

  sessionStatusLabel(session: SessionDto): string {
    const rawDate = session.plannedDate ?? session.scheduledDate;
    if (rawDate) {
      const date = new Date(rawDate);
      if (!Number.isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today ? 'Geplant' : 'Abgeschlossen';
      }
    }

    const status = session.status;
    if (!status) return 'Unbekannt';

    const normalized = status.toLowerCase();
    if (this.containsAny(normalized, ['completed', 'complete', 'done', 'abgeschlossen'])) return 'Abgeschlossen';
    if (this.containsAny(normalized, ['planned', 'planed', 'geplant', 'scheduled'])) return 'Geplant';

    return status;
  }

  private loadPlans(): void {
    this.loading = true;
    this.error = null;

    this.http
      .get<unknown>(`${this.baseUrl}/training-plans`)
      .pipe(map((res) => this.normalizePlansArray(res)))
      .subscribe({
        next: (list) => {
          const previousSelectionId = this.selectedPlan?.id ?? null;
          const previousSelectedPlan = this.selectedPlan;

          this.plans = list.map((plan) => this.mapPlanToUiPlan(plan));

          this.restoreSelection(previousSelectionId, previousSelectedPlan);
          this.loading = false;
        },
        error: () => {
          this.setError(Plans.LOAD_PLANS_ERROR_MESSAGE);
          this.loading = false;
        },
      });
  }

  private mapPlanToUiPlan(plan: any): UiPlan {
    const id = Number(plan?.id);
    const name = plan?.name ?? '';
    const description = plan?.description ?? '';

    const sessionsCount =
      typeof plan?.sessionsCount === 'number'
        ? plan.sessionsCount
        : Array.isArray(plan?.sessions)
          ? plan.sessions.length
          : undefined;

    return {
      id,
      name,
      description,
      sessionsCount,
    };
  }

  private restoreSelection(previousSelectionId: number | null, previousSelectedPlan: UiPlan | null): void {
    if (!previousSelectionId) return;

    const refreshedPlan = this.plans.find((plan) => plan.id === previousSelectionId);
    if (!refreshedPlan) {
      this.resetSelection();
      return;
    }

    refreshedPlan.sessions = previousSelectedPlan?.sessions ?? [];
    refreshedPlan.sessionsLoaded = previousSelectedPlan?.sessionsLoaded;
    refreshedPlan.loadingSessions = previousSelectedPlan?.loadingSessions;
    refreshedPlan.sessionsCount = previousSelectedPlan?.sessionsCount;

    this.selectedPlan = refreshedPlan;
    this.editForm = { name: refreshedPlan.name, desc: refreshedPlan.description ?? '' };
  }

  private applyUpdatedPlanToState(planId: number, name: string, description: string): void {
    if (this.selectedPlan?.id === planId) {
      this.selectedPlan.name = name;
      this.selectedPlan.description = description;
    }

    const listPlan = this.plans.find((p) => p.id === planId);
    if (listPlan) {
      listPlan.name = name;
      listPlan.description = description;
    }

    this.editErrors = {};
  }

  private loadSessions(plan: UiPlan): void {
    plan.sessionsLoaded = false;
    plan.loadingSessions = true;

    const params = new HttpParams().set('planId', String(plan.id));

    this.http
      .get<unknown>(`${this.baseUrl}/training-sessions`, { params })
      .pipe(
        map((res) => this.normalizeSessionsArray(res)),
        switchMap((sessions) => this.loadExecutionsForSessions(sessions))
      )
      .subscribe({
        next: (sessionsWithExecutions) => {
          plan.sessions = sessionsWithExecutions;
          plan.sessionsCount = sessionsWithExecutions.length ?? 0;
          plan.sessionsLoaded = true;
          plan.loadingSessions = false;
        },
        error: () => {
          this.setError(`Fehler beim Laden der Sessions für "${plan.name}".`);
          plan.loadingSessions = false;
          plan.sessionsLoaded = false;
        },
      });
  }

  private loadExecutionsForSessions(sessions: SessionDto[]): Observable<SessionDto[]> {
    if (!sessions || sessions.length === 0) {
      return of([] as SessionDto[]);
    }

    const requests = sessions.map((session) =>
      this.http
        .get<ExerciseExecutionDto[]>(`${this.baseUrl}/training-sessions/${session.id}/executions`)
        .pipe(
          map((executions) => this.mergeSessionWithExecutions(session, executions)),
          catchError(() => of(this.mergeSessionWithExecutions(session, [])))
        )
    );

    return forkJoin(requests);
  }

  private mergeSessionWithExecutions(session: SessionDto, executions: ExerciseExecutionDto[]): SessionDto {
    const sorted = [...(executions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      ...session,
      exerciseExecutions: sorted,
      exercisesCount: typeof session.exercisesCount === 'number' ? session.exercisesCount : sorted.length,
      performedCount: typeof session.performedCount === 'number' ? session.performedCount : 0,
      days: Array.isArray(session.days) ? session.days : [],
    };
  }

  private buildPayloadFromForm(form: PlanFormModel): PlanPayload | null {
    const name = (form.name ?? '').trim();
    if (!name) return null;

    return {
      name,
      description: (form.desc ?? '').trim(),
    };
  }

  private resetCreateForm(form?: NgForm): void {
    this.form = { name: '', desc: '' };
    form?.resetForm();
  }

  private resolveWriteErrorMessage(err: any, fallback: string): string {
    const status = Number(err?.status ?? 0);
    if (status === 401 || status === 403) return Plans.UNAUTHORIZED_MESSAGE;
    return fallback;
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private normalizePlansArray(res: unknown): any[] {
    if (Array.isArray(res)) return res;

    if (res && typeof res === 'object') {
      const obj: any = res;

      const embedded = obj?._embedded?.trainingPlans;
      if (Array.isArray(embedded)) return embedded;

      if (Array.isArray(obj?.content)) return obj.content;
      if (Array.isArray(obj?.items)) return obj.items;
      if (Array.isArray(obj?.data)) return obj.data;

      return [obj];
    }

    return [];
  }

  private normalizeSessionsArray(res: unknown): SessionDto[] {
    if (Array.isArray(res)) return res as SessionDto[];

    if (res && typeof res === 'object') {
      const obj: any = res;

      const embedded = obj?._embedded?.trainingSessions;
      if (Array.isArray(embedded)) return embedded as SessionDto[];

      if (Array.isArray(obj?.content)) return obj.content as SessionDto[];
      if (Array.isArray(obj?.items)) return obj.items as SessionDto[];
      if (Array.isArray(obj?.data)) return obj.data as SessionDto[];

      return [obj as SessionDto];
    }

    return [];
  }

  private clearMessages(): void {
    this.error = null;
    this.info = null;
  }

  private setError(message: string): void {
    this.error = message;
    this.info = null;
  }
}
