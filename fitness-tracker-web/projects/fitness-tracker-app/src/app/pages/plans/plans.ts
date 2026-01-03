import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, switchMap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

// Datenmodelle für Übungen, Pläne und Sessions
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

interface PlanDto {
  id: number;
  name: string;
  description: string;
  sessions?: SessionDto[];
  sessionsCount?: number;
}

interface SessionDto {
  id: number;
  title?: string;
  name?: string;

  // alt Datum bleibt optional im Model, wird aber im UI nicht mehr angezeigt
  plannedDate?: string | Date;
  scheduledDate?: string | Date;

  // 1-30 Tage System
  days?: number[];

  // Zählwerte
  exercisesCount?: number;
  exercises?: ExerciseDto[];
  exerciseExecutions?: ExerciseExecutionDto[];

  // wie oft durchgeführt
  performedCount?: number;

  status?: string;
}

type UiPlan = PlanDto & {
  loadingSessions?: boolean;
  sessionsLoaded?: boolean;
  sessions?: SessionDto[];
};

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule],
  templateUrl: './plans.html',
  styleUrls: ['./plans.css'],
})
export class Plans implements OnInit {
  plans: UiPlan[] = [];

  form = { name: '', desc: '' };
  editForm = { name: '', desc: '' };
  submitting = false;
  saving = false;

  loading = false;
  error: string | null = null;
  info: string | null = null;
  editErrors: { name?: string } = {};

  selectedPlan: UiPlan | null = null;

  baseUrl = environment.apiBaseUrl;

  // ✅ Live-Suche
  query = '';

  constructor(private http: HttpClient, private session: AuthSessionService) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  // Sprint 4: UI/Logik "eingeloggt"
  get isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  // ✅ Live gefilterte Pläne (ohne Enter)
  get filteredPlans(): UiPlan[] {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) return this.plans;

    return this.plans.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const sessionsCount = String(p.sessionsCount ?? '');
      return name.includes(q) || desc.includes(q) || sessionsCount.includes(q);
    });
  }

  // Tage anzeigen (1-30)
  formatDays(days?: number[] | null): string {
    if (!days || !days.length) return '–';
    return [...days]
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 30)
      .sort((a, b) => a - b)
      .join(', ');
  }

  // Pläne werden vom Backend geladen (öffentlich lesbar)
  private loadPlans(): void {
    this.loading = true;
    this.error = null;

    // GET /training-plans Request an Backend
    this.http
      .get<any>(`${this.baseUrl}/training-plans`)
      .pipe(map((res) => this.normalizePlansArray(res)))
      .subscribe({
        next: (list) => {
          const previousSelectionId = this.selectedPlan?.id;

          this.plans = list.map((p: any): UiPlan => {
            const normalized: UiPlan = {
              id: p.id,
              name: p.name,
              description: p.description ?? '',
              sessionsCount:
                typeof p.sessionsCount === 'number'
                  ? p.sessionsCount
                  : Array.isArray(p.sessions)
                  ? p.sessions.length
                  : undefined,
            };
            return normalized;
          });

          // vorher ausgewählter Plan erhalten
          if (previousSelectionId) {
            const refreshedPlan = this.plans.find((plan) => plan.id === previousSelectionId);
            if (refreshedPlan) {
              refreshedPlan.sessions = this.selectedPlan?.sessions ?? [];
              refreshedPlan.sessionsLoaded = this.selectedPlan?.sessionsLoaded;
              refreshedPlan.loadingSessions = this.selectedPlan?.loadingSessions;
              refreshedPlan.sessionsCount = this.selectedPlan?.sessionsCount;

              this.selectedPlan = refreshedPlan;
              this.editForm = {
                name: refreshedPlan.name,
                desc: refreshedPlan.description ?? '',
              };
            } else {
              this.resetSelection();
            }
          }

          this.loading = false;
        },
        error: (err) => {
          this.error = 'Fehler beim Laden der Trainingspläne';
          this.loading = false;
          console.error(err);
        },
      });
  }

  // neuen Plan anlegen (nur mit Login)
  add(f?: NgForm): void {
    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Trainingspläne anzulegen.';
      return;
    }

    if (!this.form.name.trim()) {
      this.error = 'Bitte einen Namen für den Trainingsplan angeben.';
      return;
    }

    this.submitting = true;
    this.error = null;
    this.info = null;

    const dto = {
      name: this.form.name.trim(),
      description: this.form.desc?.trim() ?? '',
    };

    // POST /training-plans (geschützt)
    this.http.post(`${this.baseUrl}/training-plans`, dto).subscribe({
      next: () => {
        this.info = 'Trainingsplan wurde erstellt.';
        this.form = { name: '', desc: '' };
        this.submitting = false;
        this.loadPlans();
        f?.resetForm();
      },
      error: (err) => {
        console.error(err);
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.error = 'Fehler beim Erstellen des Trainingsplans';
        }
        this.submitting = false;
      },
    });
  }

  // Plan auswählen (öffentlich ok)
  selectPlan(plan: UiPlan): void {
    const alreadySelected = this.selectedPlan?.id === plan.id;
    if (!alreadySelected) {
      this.selectedPlan = plan;
      this.editForm = {
        name: plan.name ?? '',
        desc: plan.description ?? '',
      };
      this.editErrors = {};
      this.info = null;
      this.error = null;
    }
    if (!plan.sessionsLoaded && !plan.loadingSessions) {
      this.loadSessions(plan);
    }
  }

  // Auswahl zurücksetzen
  resetSelection(): void {
    this.selectedPlan = null;
    this.editForm = { name: '', desc: '' };
    this.editErrors = {};
  }

  // Ausgewählten Plan speichern (nur mit Login)
  saveSelected(): void {
    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Trainingspläne zu bearbeiten.';
      return;
    }
    if (!this.selectedPlan) return;

    const trimmedName = this.editForm.name?.trim();
    if (!trimmedName) {
      this.editErrors = { name: 'Der Name darf nicht leer sein.' };
      return;
    }

    this.saving = true;
    this.error = null;
    this.info = null;

    const dto = {
      name: trimmedName,
      description: this.editForm.desc?.trim() ?? '',
    };

    // PUT /training-plans/{id} (geschützt)
    this.http.put<PlanDto>(`${this.baseUrl}/training-plans/${this.selectedPlan.id}`, dto).subscribe({
      next: (updated) => {
        const payload = updated ?? dto;

        this.selectedPlan!.name = payload.name ?? dto.name;
        this.selectedPlan!.description = payload.description ?? dto.description;

        const listPlan = this.plans.find((plan) => plan.id === this.selectedPlan!.id);
        if (listPlan) {
          listPlan.name = this.selectedPlan!.name;
          listPlan.description = this.selectedPlan!.description;
        }

        this.info = 'Trainingsplan wurde erfolgreich aktualisiert.';
        this.saving = false;
      },
      error: (err) => {
        console.error(err);
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.error = 'Aktualisieren des Trainingsplans ist fehlgeschlagen.';
        }
        this.saving = false;
      },
    });
  }

  // Sessions zu dem Plan laden (öffentlich lesbar)
  private loadSessions(plan: UiPlan): void {
    plan.sessionsLoaded = false;
    plan.loadingSessions = true;

    const params = new HttpParams().set('planId', String(plan.id));

    // GET /training-sessions?planId=... (öffentlich)
    this.http
      .get<any>(`${this.baseUrl}/training-sessions`, { params })
      .pipe(
        map((res) => this.normalizeSessionsArray(res)),
        switchMap((sessions: SessionDto[]) => {
          if (!sessions || sessions.length === 0) {
            return of([] as SessionDto[]);
          }

          const withExecutions$ = sessions.map((session) =>
            this.http
              .get<ExerciseExecutionDto[]>(
                `${this.baseUrl}/training-sessions/${session.id}/executions`
              )
              .pipe(
                map((executions) => {
                  const sorted = [...executions].sort((a, b) => a.orderIndex - b.orderIndex);

                  return {
                    ...session,
                    exerciseExecutions: sorted,
                    exercisesCount:
                      typeof session.exercisesCount === 'number'
                        ? session.exercisesCount
                        : sorted.length,
                    performedCount:
                      typeof session.performedCount === 'number' ? session.performedCount : 0,
                    days: Array.isArray(session.days) ? session.days : [],
                  } as SessionDto;
                }),
                catchError((err) => {
                  console.error(`Fehler beim Laden der Exercises für Session ${session.id}`, err);
                  return of({
                    ...session,
                    exerciseExecutions: [],
                    exercisesCount:
                      typeof session.exercisesCount === 'number' ? session.exercisesCount : 0,
                    performedCount:
                      typeof session.performedCount === 'number' ? session.performedCount : 0,
                    days: Array.isArray(session.days) ? session.days : [],
                  } as SessionDto);
                })
              )
          );

          return forkJoin(withExecutions$);
        })
      )
      .subscribe({
        next: (sessionsWithExecutions: SessionDto[]) => {
          plan.sessions = sessionsWithExecutions;
          plan.sessionsCount = sessionsWithExecutions.length ?? 0;
          plan.sessionsLoaded = true;
          plan.loadingSessions = false;
        },
        error: (err) => {
          this.error = `Fehler beim Laden der Sessions für "${plan.name}".`;
          plan.loadingSessions = false;
          plan.sessionsLoaded = false;
          console.error(err);
        },
      });
  }

  // Plan löschen (nur mit Login)
  delete(plan: UiPlan, e?: MouseEvent): void {
    e?.stopPropagation();

    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Trainingspläne zu löschen.';
      return;
    }

    if (!window.confirm(`Möchte Sie ${plan.name} wirklich löschen?`)) return;

    // DELETE /training-plans/{id} (geschützt)
    this.http.delete(`${this.baseUrl}/training-plans/${plan.id}`).subscribe({
      next: () => {
        // falls gerade ausgewählt -> resetten
        if (this.selectedPlan?.id === plan.id) this.resetSelection();
        this.loadPlans();
      },
      error: (err) => {
        console.error(err);
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.error = `Fehler beim Löschen von ${plan.name}.`;
        }
      },
    });
  }

  trackByPlan = (_: number, p: UiPlan) => p.id;
  trackBySession = (_: number, s: SessionDto) => s.id;


  sessionStatusLabel(session: SessionDto): string {
    const rawDate = session.plannedDate ?? session.scheduledDate;
    if (rawDate) {
      const date = new Date(rawDate);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date >= today) {
          return 'Geplant';
        }
        return 'Abgeschlossen';
      }
    }

    const status = session.status;
    if (!status) return 'Unbekannt';
    const normalized = status.toLowerCase();
    const doneKeywords = ['completed', 'complete', 'done', 'abgeschlossen'];
    if (doneKeywords.some((keyword) => normalized.includes(keyword))) {
      return 'Abgeschlossen';
    }
    const plannedKeywords = ['planned', 'planed', 'geplant', 'scheduled'];
    if (plannedKeywords.some((keyword) => normalized.includes(keyword))) {
      return 'Geplant';
    }
    return status;
  }

  // Vereinheitlicht verschiedene Backend Antworten zu einem Array
  private normalizePlansArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res?._embedded?.trainingPlans && Array.isArray(res._embedded.trainingPlans)) {
      return res._embedded.trainingPlans;
    }
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }

  // Vereinheitlicht verschiedene Backend Antworten zu einem Array
  private normalizeSessionsArray(res: any): SessionDto[] {
    if (Array.isArray(res)) return res;
    if (res?._embedded?.trainingSessions && Array.isArray(res._embedded.trainingSessions)) {
      return res._embedded.trainingSessions;
    }
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }
}
