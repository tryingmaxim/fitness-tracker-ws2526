import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environment';
import { forkJoin } from 'rxjs';

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
  exerciseNames?: string[];
}

interface Exercise {
  id: number;
  name: string;
  category?: string;
  muscleGroups?: string;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, HttpClientModule],
  templateUrl: './sessions.html',
  styleUrls: ['./sessions.css'],
})
export class Sessions implements OnInit {
  private readonly baseUrl = environment.apiBaseUrl;

  plans: TrainingPlan[] = [];
  sessions: TrainingSession[] = [];

  form = {
    planId: null as number | null,
    name: '',
    date: '',
  };

  detailForm = {
    id: null as number | null,
    planId: null as number | null,
    name: '',
    date: '',
  };

  selectedSession: TrainingSession | null = null;

  sessionSearch = '';

  exercises: Exercise[] = [];
  filteredExercises: Exercise[] = [];
  exerciseSearch = '';
  selectedExerciseIds: number[] = [];

  detailSelectedExerciseIds: number[] = [];
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlans();
    this.loadSessions();
    this.loadExercises();
  }

  get filteredSessionsForOverview(): TrainingSession[] {
    const term = this.sessionSearch.trim().toLowerCase();
    if (!term) return this.sessions;
    return this.sessions.filter((s) => (s.name ?? '').toLowerCase().includes(term));
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
      next: (createdSession) => {
        const sessionId = createdSession?.id;

        if (!sessionId || !this.selectedExerciseIds.length) {
          this.afterCreateSuccess();
          return;
        }

        const requests = this.selectedExerciseIds.map((exerciseId, index) =>
          this.http.post(`${this.baseUrl}/training-sessions/${sessionId}/executions`, {
            exerciseId,
            orderIndex: index + 1,
            notes: null,
          })
        );

        forkJoin(requests).subscribe({
          next: () => {
            this.afterCreateSuccess();
          },
          error: (err) => {
            console.error('Konnte ExerciseExecutions nicht anlegen', err);
            this.creating = false;
            this.errorMsg = 'Session wurde angelegt, aber Übungen konnten nicht zugeordnet werden.';
            this.loadSessions();
          },
        });
      },
      error: (err) => {
        this.creating = false;
        this.errorMsg = err?.error?.detail || 'Session konnte nicht angelegt werden.';
        console.error(err);
      },
    });
  }

  private afterCreateSuccess(): void {
    this.infoMsg = 'Session wurde hinzugefügt.';
    this.form.name = '';
    this.form.date = '';
    this.selectedExerciseIds = [];
    this.exerciseSearch = '';
    this.filteredExercises = [...this.exercises];
    this.loadSessions();
    this.loadPlans();
    this.creating = false;
  }

  openDatePicker(input: HTMLInputElement): void {
    const anyInput = input as any;

    if (typeof anyInput.showPicker === 'function') {
      anyInput.showPicker();
    } else {
      input.focus();
    }
  }

  getPlanName(planId: number | null, fallback?: string): string {
    if (fallback) {
      return fallback;
    }
    const plan = this.plans.find((p) => p.id === planId);
    return plan?.name ?? '-';
  }

  joinExerciseNames(session: TrainingSession): string {
    return (session.exerciseNames ?? []).join(', ');
  }

  trackBySession = (_: number, session: TrainingSession) =>
    session.id ?? `${session.name}-${session.date}`;

  selectSession(session: TrainingSession): void {
    if (!session.id) return;

    this.selectedSession = session;
    this.detailLoading = true;
    this.errorMsg = '';
    this.infoMsg = '';

    const date = (session.date as string) ?? '';
    const planId = session.planId ?? null;

    this.detailForm = {
      id: session.id ?? null,
      name: session.name,
      date,
      planId,
    };

    this.http.get<any[]>(`${this.baseUrl}/training-sessions/${session.id}/executions`).subscribe({
      next: (execs) => {
        this.detailSelectedExerciseIds = execs
          .map((e: any) => e.exercise?.id as number | null | undefined)
          .filter((id: number | null | undefined): id is number => typeof id === 'number');

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
    this.detailSelectedExerciseIds = [];
    this.detailExerciseSearch = '';
    this.detailForm = {
      id: null,
      planId: null,
      name: '',
      date: '',
    };
  }

  updateSelectedSession(): void {
    if (!this.detailForm.id) return;

    const trimmedName = this.detailForm.name?.trim();
    if (!trimmedName || !this.detailForm.date || !this.detailForm.planId) {
      this.errorMsg = 'Bitte Name, Plan und Datum angeben.';
      return;
    }

    this.errorMsg = '';
    this.infoMsg = '';
    this.updating = true;

    const payload = {
      planId: this.detailForm.planId,
      name: trimmedName,
      scheduledDate: this.detailForm.date,
    };

    const id = this.detailForm.id;

    this.http.patch<any>(`${this.baseUrl}/training-sessions/${id}`, payload).subscribe({
      next: (updated) => {
        const s = this.sessions.find((sess) => sess.id === id);
        if (s) {
          s.name = updated?.name ?? trimmedName;
          s.date = updated?.scheduledDate ?? this.detailForm.date;
          s.planId = updated?.planId ?? this.detailForm.planId;
          s.planName = this.getPlanName(s.planId, s.planName);
        }

        if (this.selectedSession && this.selectedSession.id === id) {
          this.selectedSession.name = s?.name ?? trimmedName;
          this.selectedSession.date = s?.date ?? this.detailForm.date;
          this.selectedSession.planId = s?.planId ?? this.detailForm.planId;
        }

        this.http.get<any[]>(`${this.baseUrl}/training-sessions/${id}/executions`).subscribe({
          next: (execs) => {
            const desiredIds = [...this.detailSelectedExerciseIds];
            const existingByExerciseId = new Map<number, any>();
            execs.forEach((e: any) => {
              const exId = e.exercise?.id;
              if (typeof exId === 'number') {
                existingByExerciseId.set(exId, e);
              }
            });

            const toDelete = execs.filter((e: any) => {
              const exId = e.exercise?.id;
              return typeof exId === 'number' && !desiredIds.includes(exId);
            });

            const toAddIds = desiredIds.filter((id) => !existingByExerciseId.has(id));

            let maxOrder = execs.reduce(
              (m: number, e: any) =>
                Math.max(m, typeof e.orderIndex === 'number' ? e.orderIndex : 0),
              0
            );

            const deleteReqs = toDelete.map((e: any) =>
              this.http.delete(`${this.baseUrl}/training-sessions/${id}/executions/${e.id}`)
            );

            const addReqs = toAddIds.map((exerciseId) =>
              this.http.post(`${this.baseUrl}/training-sessions/${id}/executions`, {
                exerciseId,
                orderIndex: ++maxOrder,
                notes: null,
              })
            );

            const allReqs = [...deleteReqs, ...addReqs];

            if (!allReqs.length) {
              this.updating = false;
              this.infoMsg = 'Session wurde aktualisiert.';
              this.enrichSessionsWithExerciseNames();
              return;
            }

            forkJoin(allReqs).subscribe({
              next: () => {
                this.updating = false;
                this.infoMsg = 'Session wurde aktualisiert.';
                const exercisesForSession = this.getDetailExercises();
                if (s) {
                  s.exerciseNames = exercisesForSession.map((e) => e.name);
                }
                if (this.selectedSession && this.selectedSession.id === id) {
                  this.selectedSession.exerciseNames = exercisesForSession.map((e) => e.name);
                }
                this.enrichSessionsWithExerciseNames();
              },
              error: (err) => {
                console.error('Konnte Übungen für Session nicht aktualisieren', err);
                this.updating = false;
                this.errorMsg =
                  'Session wurde teilweise aktualisiert (Übungen konnten nicht gespeichert werden).';
              },
            });
          },
          error: (err) => {
            console.error('Executions konnten nicht geladen werden', err);
            this.updating = false;
            this.errorMsg =
              'Session wurde aktualisiert, aber Übungen konnten nicht geladen werden.';
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.updating = false;
        this.errorMsg = 'Session konnte nicht aktualisiert werden.';
      },
    });
  }

  deleteSession(session: TrainingSession, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!session.id) return;

    const confirmed = window.confirm(`Möchtest du die Session "${session.name}" wirklich löschen?`);
    if (!confirmed) return;

    this.errorMsg = '';
    this.infoMsg = '';
    this.deleting = true;
    this.deleteId = session.id;

    this.http.delete(`${this.baseUrl}/training-sessions/${session.id}`).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteId = null;
        this.infoMsg = 'Session wurde gelöscht.';
        this.sessions = this.sessions.filter((s) => s.id !== session.id);

        if (this.selectedSession?.id === session.id) {
          this.clearSelection();
        }
      },
      error: (err) => {
        console.error(err);
        this.deleting = false;
        this.deleteId = null;
        this.errorMsg = 'Session konnte nicht gelöscht werden.';
      },
    });
  }

  private loadExercises(): void {
    this.loadingExercises = true;
    this.http.get<any>(`${this.baseUrl}/exercises`).subscribe({
      next: (res) => {
        this.exercises = this.flattenCollection(res, 'exercises').map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          muscleGroups: e.muscleGroups,
        }));
        this.filteredExercises = [...this.exercises];
        this.loadingExercises = false;
        this.enrichSessionsWithExerciseNames();
      },
      error: (err) => {
        console.error(err);
        this.loadingExercises = false;
      },
    });
  }

  onExerciseSearchChange(): void {
    const term = this.exerciseSearch.trim().toLowerCase();
    if (!term) {
      this.filteredExercises = [...this.exercises];
      return;
    }
    this.filteredExercises = this.exercises.filter((e) => e.name.toLowerCase().includes(term));
  }

  toggleExercise(ex: Exercise): void {
    const idx = this.selectedExerciseIds.indexOf(ex.id);
    if (idx >= 0) {
      this.selectedExerciseIds.splice(idx, 1);
    } else {
      this.selectedExerciseIds.push(ex.id);
    }
  }

  isExerciseSelected(ex: Exercise): boolean {
    return this.selectedExerciseIds.includes(ex.id);
  }

  getDetailExercises(): Exercise[] {
    if (!this.detailSelectedExerciseIds.length) return [];
    return this.exercises.filter((e) => this.detailSelectedExerciseIds.includes(e.id));
  }

  getAvailableDetailExercises(): Exercise[] {
    const term = this.detailExerciseSearch.trim().toLowerCase();
    return this.exercises.filter((e) => {
      if (this.detailSelectedExerciseIds.includes(e.id)) return false;
      if (!term) return true;
      return e.name.toLowerCase().includes(term);
    });
  }

  addExerciseToDetail(ex: Exercise): void {
    if (!this.detailSelectedExerciseIds.includes(ex.id)) {
      this.detailSelectedExerciseIds.push(ex.id);
    }
    this.detailExerciseSearch = '';
  }

  removeExerciseFromDetail(ex: Exercise): void {
    this.detailSelectedExerciseIds = this.detailSelectedExerciseIds.filter((id) => id !== ex.id);
  }

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
    const previouslySelectedId = this.selectedSession?.id ?? null;

    this.http.get<any>(`${this.baseUrl}/training-sessions`).subscribe({
      next: (res) => {
        this.sessions = this.flattenCollection(res, 'trainingSessions').map((session) =>
          this.toUiSession(session)
        );
        this.loadingSessions = false;
        this.enrichSessionsWithExerciseNames();

        if (previouslySelectedId) {
          const match = this.sessions.find((s) => s.id === previouslySelectedId);
          if (match) {
            this.selectedSession = match;
          } else {
            this.clearSelection();
          }
        }
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

  private enrichSessionsWithExerciseNames(): void {
    if (!this.sessions.length || !this.exercises.length) return;

    const sessionsWithId = this.sessions.filter((s) => !!s.id);
    if (!sessionsWithId.length) return;

    const requests = sessionsWithId.map((s) =>
      this.http.get<any[]>(`${this.baseUrl}/training-sessions/${s.id}/executions`)
    );

    forkJoin(requests).subscribe({
      next: (detailsLists) => {
        detailsLists.forEach((execs, index) => {
          const session = sessionsWithId[index];

          const names = execs
            .map((e: any) => this.exercises.find((ex) => ex.id === e.exercise?.id)?.name)
            .filter((n: string | undefined): n is string => !!n);

          session.exerciseNames = names;

          if (this.selectedSession && this.selectedSession.id === session.id) {
            this.detailSelectedExerciseIds = execs
              .map((e: any) => e.exercise?.id as number | null | undefined)
              .filter((id: number | null | undefined): id is number => typeof id === 'number');
          }
        });
      },
      error: (err) => {
        console.error('Konnte Übungen für Sessions nicht laden', err);
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
