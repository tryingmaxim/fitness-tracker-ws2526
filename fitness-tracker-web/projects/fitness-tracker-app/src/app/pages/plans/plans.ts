import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { map, switchMap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../../environment';

//Datenmodelle für Übungen, Pläne und Sessions
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

  //  alt (Datum) bleibt optional im Model, wird aber im UI nicht mehr angezeigt
  plannedDate?: string | Date;
  scheduledDate?: string | Date;

  //  NEU: unser 1-30 Tage System
  days?: number[];

  // Zählwerte
  exercisesCount?: number;
  exercises?: ExerciseDto[];
  exerciseExecutions?: ExerciseExecutionDto[];

  //  NEU: wie oft durchgeführt
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
  imports: [CommonModule, NgIf, NgForOf, FormsModule, HttpClientModule],
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  baseUrl = environment.apiBaseUrl;

  //  Helper: Tage  anzeigen (1-30)
  formatDays(days?: number[] | null): string {
    if (!days || !days.length) return '–';
    return [...days]
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 30)
      .sort((a, b) => a - b)
      .join(', ');
  }

  //Pläne werden vom Backend geladen
  private loadPlans(): void {
    this.loading = true;
    this.error = null;

    //GET /training-plans Request an Backend
    this.http
      .get<any>(`${this.baseUrl}/training-plans`)
      .pipe(map((res) => this.normalizePlansArray(res)))
      .subscribe({
        next: (list) => {
          const previousSelectionId = this.selectedPlan?.id;

          //UIPlan wird erstellt
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

          //vorher ausgewählter Plan und die dazugehörigen Session Daten bleiben erhalten
          if (previousSelectionId) {
            const refreshedPlan = this.plans.find(
              (plan) => plan.id === previousSelectionId
            );
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

  //neuen Plan anlegen
  add(f?: NgForm): void {
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

    //POST /training-plans Request an Backend
    this.http.post(`${this.baseUrl}/training-plans`, dto).subscribe({
      next: () => {
        this.info = 'Trainingsplan wurde erstellt.';
        this.form = { name: '', desc: '' };
        this.submitting = false;
        this.loadPlans();
        f?.resetForm();
      },
      error: (err) => {
        this.error = 'Fehler beim Erstellen des Trainingsplans';
        this.submitting = false;
        console.error(err);
      },
    });
  }

  //Plan auswählen für Bearbeitung
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
    }
    if (!plan.sessionsLoaded && !plan.loadingSessions) {
      this.loadSessions(plan);
    }
  }

  //Auswahl zurücksetzen
  resetSelection(): void {
    this.selectedPlan = null;
    this.editForm = { name: '', desc: '' };
    this.editErrors = {};
  }

  //Ausgewählten Plan speichern
  saveSelected(): void {
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

    //PUT /training-plans Request an Backend
    this.http
      .put<PlanDto>(
        `${this.baseUrl}/training-plans/${this.selectedPlan.id}`,
        dto
      )
      .subscribe({
        next: (updated) => {
          const payload = updated ?? dto;
          this.selectedPlan!.name = payload.name ?? dto.name;
          this.selectedPlan!.description =
            payload.description ?? dto.description;
          const listPlan = this.plans.find(
            (plan) => plan.id === this.selectedPlan!.id
          );
          if (listPlan) {
            listPlan.name = this.selectedPlan!.name;
            listPlan.description = this.selectedPlan!.description;
          }
          this.info = 'Trainingsplan wurde erfolgreich aktualisiert.';
          this.saving = false;
        },
        error: (err) => {
          this.error = 'Aktualisieren des Trainingsplans ist fehlgeschlagen.';
          this.saving = false;
          console.error(err);
        },
      });
  }

  //Sessions zu dem Plan laden
  private loadSessions(plan: UiPlan): void {
    plan.sessionsLoaded = false;
    plan.loadingSessions = true;

    const params = new HttpParams().set('planId', String(plan.id));

    //GET /training-sessions Request an Backend
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
                  const sorted = [...executions].sort(
                    (a, b) => a.orderIndex - b.orderIndex
                  );

                  return {
                    ...session,
                    exerciseExecutions: sorted,

                    //  Count: wenn Backend mitgibt, behalten; sonst sorted length
                    exercisesCount:
                      typeof session.exercisesCount === 'number'
                        ? session.exercisesCount
                        : sorted.length,

                    // performedCount: aus list-response übernehmen (wenn nicht vorhanden -> 0 im UI)
                    performedCount:
                      typeof session.performedCount === 'number'
                        ? session.performedCount
                        : 0,

                    // days bleiben wie geliefert
                    days: Array.isArray(session.days) ? session.days : [],
                  } as SessionDto;
                }),
                catchError((err) => {
                  console.error(
                    `Fehler beim Laden der Exercises für Session ${session.id}`,
                    err
                  );
                  return of({
                    ...session,
                    exerciseExecutions: [],
                    exercisesCount:
                      typeof session.exercisesCount === 'number'
                        ? session.exercisesCount
                        : 0,
                    performedCount:
                      typeof session.performedCount === 'number'
                        ? session.performedCount
                        : 0,
                    days: Array.isArray(session.days) ? session.days : [],
                  } as SessionDto);
                })
              )
          );

          return forkJoin(withExecutions$);
        })
      )
      //Sessions und deren Übungen werden im Plan gespeichert
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

  //Plan löschen
  delete(plan: UiPlan, e?: MouseEvent): void {
    e?.stopPropagation();
    if (!window.confirm(`Möchte Sie ${plan.name} wirklich löschen?`)) return;

    this.http
      .delete(`${this.baseUrl}/training-plans/${plan.id}`)
      .subscribe({
        next: () => this.loadPlans(),
        error: (err) => {
          this.error = `Fehler beim Löschen von ${plan.name}.`;
          console.error(err);
        },
      });
  }

  trackByPlan = (_: number, p: UiPlan) => p.id;
  trackBySession = (_: number, s: SessionDto) => s.id;

  // (kann drin bleiben, wird aber im UI jetzt nicht mehr benutzt)
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

  //Vereinheitlicht verschiedene Backend Antworten zu einem Array
  private normalizePlansArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (
      res?._embedded?.trainingPlans &&
      Array.isArray(res._embedded.trainingPlans)
    ) {
      return res._embedded.trainingPlans;
    }
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }

  //Vereinheitlicht verschiedene Backend Antworten zu einem Array
  private normalizeSessionsArray(res: any): SessionDto[] {
    if (Array.isArray(res)) return res;
    if (
      res?._embedded?.trainingSessions &&
      Array.isArray(res._embedded.trainingSessions)
    ) {
      return res._embedded.trainingSessions;
    }
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (res && typeof res === 'object') return [res];
    return [];
  }
}