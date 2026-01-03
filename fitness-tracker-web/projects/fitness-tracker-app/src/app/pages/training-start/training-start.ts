import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription, forkJoin, of, switchMap, catchError } from 'rxjs';
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

@Component({
  selector: 'app-training-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

  actual: Record<number, ActualEntry> = {};

  actualInput: Record<number, ActualInputEntry> = {};

  errors: Record<number, FieldErrors> = {};

  toast: { type: 'success' | 'error' | 'info'; text: string } | null = null;
  starting = false;
  saving = false;
  finishing = false;

  private sub = new Subscription();

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  //liest Session ID aus URL und lädt die Session
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

            //lädt Session Daten 
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

  //prüft ob Training gestartet werden darf 
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

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', 'Bitte korrigiere die Eingaben (nur gültige Zahlen).');
      return;
    }

    this.starting = true;

    //TrainingExecution im Backend anlegen und Training aktivieren
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

  //speichert Fortschritt aller Übungen eines laufenden trainings
  saveProgress(): void {
    if (!this.session || this.sessionId == null) return;

    if (!this.executionId || this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', 'Bitte starte zuerst das Training.');
      return;
    }

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', 'Speichern nicht möglich: Bitte korrigiere die rot markierten Felder.');
      return;
    }

    this.saving = true;

    const requests = this.session.exerciseExecutions.map((p) => {
      const a = this.actual[p.exerciseId];

      const body = {
        exerciseId: p.exerciseId,
        actualSets: this.clampIntMin(a?.actualSets, 1),
        actualReps: this.clampIntMin(a?.actualReps, 1),
        actualWeightKg: this.clampFloatMin(a?.actualWeightKg, 0),
        done: Boolean(a?.done ?? false),
        notes: (a?.notes ?? '').trim() || null,
      };

      //Fortschritt im Backend speichern
      return this.http.put<TrainingExecutionResponse>(
        `${this.baseUrl}/training-executions/${this.executionId}/exercises`,
        body
      );
    });

    forkJoin(requests).subscribe({
      next: () => {
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

  //schließt laufendes Training ab 
  finishTraining(): void {
    if (!this.executionId) {
      this.showToast('error', 'Bitte starte zuerst das Training.');
      return;
    }

    if (this.executionStatus !== 'IN_PROGRESS') {
      this.showToast('error', 'Training ist nicht im Status IN_PROGRESS.');
      return;
    }

    this.validateAllFields();
    if (this.hasValidationErrors()) {
      this.showToast('error', 'Abschließen nicht möglich: Bitte korrigiere die rot markierten Felder.');
      return;
    }

    this.finishing = true;

    //finalen Stand im Backend speichern
    const saveRequests =
      this.session?.exerciseExecutions?.map((p) => {
        const a = this.actual[p.exerciseId];
        return this.http.put<TrainingExecutionResponse>(
          `${this.baseUrl}/training-executions/${this.executionId}/exercises`,
          {
            exerciseId: p.exerciseId,
            actualSets: this.clampIntMin(a?.actualSets, 1),
            actualReps: this.clampIntMin(a?.actualReps, 1),
            actualWeightKg: this.clampFloatMin(a?.actualWeightKg, 0),
            done: Boolean(a?.done ?? false),
            notes: (a?.notes ?? '').trim() || null,
          }
        );
      }) ?? [];

    const saveAll$ = saveRequests.length ? forkJoin(saveRequests) : of([]);

    //Nachdem speichern das Trainng abschließen
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

  //laufendes Training abbrechen
  cancelTraining(): void {
    if (!this.executionId) {
      this.clearLocalDraft();
      this.resetRuntime();
      this.showToast('info', 'Entwurf verworfen.');
      return;
    }

    //Training im backend löschen
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

  //speichert Benutzereingaben lokal als Entwurf
  onRawInputChange(exerciseId: number, field: FieldKey, value: string): void {
    if (!this.actualInput[exerciseId]) this.actualInput[exerciseId] = { sets: '1', reps: '1', weight: '0' };
    this.actualInput[exerciseId][field] = (value ?? '').toString();

    this.validateAndApply(exerciseId, field);

    this.persistLocalDraft();
  }

  //blockiert unerlaubte tastatureingaben
  onNumberKeyDown(ev: KeyboardEvent, type: FieldType): void {
    const allowedControl = [
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

    if (allowedControl.includes(ev.key)) return;
    if (ev.ctrlKey || ev.metaKey) return; 

    if (ev.key === '-' || ev.key === '+' || ev.key.toLowerCase() === 'e') {
      ev.preventDefault();
      return;
    }

    if (type === 'int') {
      if (!/^\d$/.test(ev.key)) ev.preventDefault();
      return;
    }

    if (/^\d$/.test(ev.key)) return;

    if (ev.key === '.' || ev.key === ',') {
      const input = ev.target as HTMLInputElement | null;
      const current = (input?.value ?? '');
      if (current.includes('.') || current.includes(',')) {
        ev.preventDefault();
      }
      return;
    }

    ev.preventDefault();
  }

  //validiert eingefügte Texte
  onNumberPaste(ev: ClipboardEvent, type: FieldType): void {
    const txt = (ev.clipboardData?.getData('text') ?? '').trim();
    const ok = type === 'int' ? /^\d+$/.test(txt) : /^\d+([.,]\d+)?$/.test(txt);
    if (!ok) {
      ev.preventDefault();
    }
  }

 
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

  //lädt aktuellen Trainingsstand
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
        fn();
      },
    });
  }

  //lädt eine Trainingseinheit und setzt lokalen Zustand
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

  //Überträgt aktuellen Trainingsstand in UI Zustand und stellt sicher, dass alle Übungsdaten UI tauglich vorliegen
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
            actualSets: 1,
            actualReps: 1,
            actualWeightKg: 0,
            done: false,
            notes: '',
          };
        }

        this.actual[exId].actualSets = this.clampIntMin(Number(e.actualSets ?? 1), 1);
        this.actual[exId].actualReps = this.clampIntMin(Number(e.actualReps ?? 1), 1);
        this.actual[exId].actualWeightKg = this.clampFloatMin(Number(e.actualWeightKg ?? 0), 0);
        this.actual[exId].done = Boolean(e.done);
        this.actual[exId].notes = (e.notes ?? '') || '';

        if (!this.actualInput[exId]) this.actualInput[exId] = { sets: '1', reps: '1', weight: '0' };
        this.actualInput[exId].sets = String(this.actual[exId].actualSets);
        this.actualInput[exId].reps = String(this.actual[exId].actualReps);
        this.actualInput[exId].weight = this.formatWeight(this.actual[exId].actualWeightKg);

        this.errors[exId] = {};
      }
    }
  }

  //initalisiert aktuelle Wrte von Übungen und Input Feldern bevor Training gestartet/fortgesetzt wird
  private initActualFromPlan(): void {
    if (!this.session) return;

    const next: Record<number, ActualEntry> = {};
    const nextInput: Record<number, ActualInputEntry> = {};
    const nextErrors: Record<number, FieldErrors> = {};

    for (const p of this.session.exerciseExecutions) {
      next[p.exerciseId] = {
        exerciseId: p.exerciseId,
        actualSets: 1,
        actualReps: 1,
        actualWeightKg: 0,
        done: false,
        notes: '',
      };

      nextInput[p.exerciseId] = {
        sets: '1',
        reps: '1',
        weight: '0',
      };

      nextErrors[p.exerciseId] = {};
    }

    this.actual = next;
    this.actualInput = nextInput;
    this.errors = nextErrors;
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

  //erzeugt eindeutigen Schlüssel für Trainingsentwurf einer Session
  private localKey(sessionId: number): string {
    return `trainingExecutionDraft:session:${sessionId}`;
  }

  //speichert aktuellen Trainingsfortschritt als Entwurf
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
    try {
      localStorage.setItem(this.localKey(this.sessionId), JSON.stringify(payload));
    } catch {
    }
  }

  //stellt zwischengespeicherten Entwurft wieder her
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
            actualSets: this.clampIntMin(Number(src.actualSets ?? 1), 1),
            actualReps: this.clampIntMin(Number(src.actualReps ?? 1), 1),
            actualWeightKg: this.clampFloatMin(Number(src.actualWeightKg ?? 0), 0),
            done: Boolean(src.done),
            notes: typeof src.notes === 'string' ? src.notes : '',
          };
        }
      }

      if (parsed.actualInput && typeof parsed.actualInput === 'object') {
        for (const key of Object.keys(parsed.actualInput)) {
          const exId = Number(key);
          if (!this.actualInput[exId]) continue;
          const src = parsed.actualInput[key];

          this.actualInput[exId] = {
            sets: typeof src.sets === 'string' ? src.sets : String(this.actual[exId].actualSets),
            reps: typeof src.reps === 'string' ? src.reps : String(this.actual[exId].actualReps),
            weight: typeof src.weight === 'string' ? src.weight : this.formatWeight(this.actual[exId].actualWeightKg),
          };
        }
      } else {
        for (const exIdStr of Object.keys(this.actual)) {
          const exId = Number(exIdStr);
          if (!this.actualInput[exId]) {
            this.actualInput[exId] = {
              sets: String(this.actual[exId].actualSets),
              reps: String(this.actual[exId].actualReps),
              weight: this.formatWeight(this.actual[exId].actualWeightKg),
            };
          }
        }
      }
      if (parsed.errors && typeof parsed.errors === 'object') {
        this.errors = parsed.errors;
      }

      this.validateAllFields();
    } catch {
    }
  }

  //löscht gespeicherten Entwurf
  private clearLocalDraft(): void {
    if (!this.sessionId) return;
    try {
      localStorage.removeItem(this.localKey(this.sessionId));
    } catch {
    }
  }

  //setzt aktuellen Trainingslauf komplett zurück
  private resetRuntime(): void {
    this.executionId = null;
    this.executionStatus = null;
    this.startedAt = null;
    this.completedAt = null;
    this.initActualFromPlan();
  }

  //validiert alle Eingabefelder aller Übungen
  private validateAllFields(): void {
    if (!this.session) return;
    for (const p of this.session.exerciseExecutions) {
      const exId = p.exerciseId;
      this.validateAndApply(exId, 'sets');
      this.validateAndApply(exId, 'reps');
      this.validateAndApply(exId, 'weight');
    }
  }

  //übernimmt Wert eines Eingabefelds nur bei gültiger Eingabe
  private validateAndApply(exerciseId: number, field: FieldKey): void {
    if (!this.actual[exerciseId]) return;
    if (!this.actualInput[exerciseId]) this.actualInput[exerciseId] = { sets: '1', reps: '1', weight: '0' };
    if (!this.errors[exerciseId]) this.errors[exerciseId] = {};

    const raw = (this.actualInput[exerciseId][field] ?? '').toString().trim();

    if (!raw) {
      if (field === 'weight') {
        this.errors[exerciseId][field] = 'Bitte eine Zahl ≥ 0 eingeben.';
      } else {
        this.errors[exerciseId][field] = 'Bitte eine ganze Zahl ≥ 1 eingeben.';
      }
      return;
    }

    if (field === 'sets' || field === 'reps') {
      if (!/^\d+$/.test(raw)) {
        this.errors[exerciseId][field] = 'Nur ganze Zahlen ohne Sonderzeichen (≥ 1).';
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1) {
        this.errors[exerciseId][field] = 'Muss mindestens 1 sein.';
        return;
      }
      this.errors[exerciseId][field] = undefined;
      const intVal = Math.trunc(n);
      if (field === 'sets') this.actual[exerciseId].actualSets = intVal;
      else this.actual[exerciseId].actualReps = intVal;
      return;
    }

    if (!/^\d+([.,]\d+)?$/.test(raw)) {
      this.errors[exerciseId][field] = 'Nur Zahlen (z.B. 20 oder 20,5). Keine Sonderzeichen.';
      return;
    }

    const normalized = raw.replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) {
      this.errors[exerciseId][field] = 'Muss mindestens 0 sein.';
      return;
    }

    this.errors[exerciseId][field] = undefined;
    this.actual[exerciseId].actualWeightKg = this.roundToTenth(n);
  }

  //prüft ob Validierungsfehler existieren
  private hasValidationErrors(): boolean {
    for (const exIdStr of Object.keys(this.errors)) {
      const e = this.errors[Number(exIdStr)];
      if (!e) continue;
      if (e.sets || e.reps || e.weight) return true;
    }
    return false;
  }

  //Stellt sicher, dass eine Zahl über dem Mindestwert ist
  private clampIntMin(v: any, min: number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    const i = Math.trunc(n);
    return i < min ? min : i;
  }

  //Stellt sicher, dass eine Kommazahl über dem Mindestwer ist
  private clampFloatMin(v: any, min: number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return n < min ? min : this.roundToTenth(n);
  }

  //rundet Zahl auf eine Nachkommastelle
  private roundToTenth(n: number): number {
    return Math.round(n * 10) / 10;
  }

  //formatiert Gewicht auf eine Nachkommastelle
  private formatWeight(n: number): string {
    return Number.isFinite(n) ? String(this.roundToTenth(n)) : '0';
  }

  //markiert Übung als erledigt/nicht erledigt
  onToggleDone(exerciseId: number, checked: boolean): void {
    const a = this.actual[exerciseId];
    if (!a) return;
    a.done = checked;
    this.persistLocalDraft();
  }

  //aktualisiert Notizen und speichert sie lokal
  onNotesChange(exerciseId: number): void {
    const a = this.actual[exerciseId];
    if (!a) return;
    a.notes = (a.notes ?? '').toString();
    this.persistLocalDraft();
  }

  //zeigt Temporäre Benachrichtigung
  private showToast(type: 'success' | 'error' | 'info', text: string): void {
    this.toast = { type, text };
    window.setTimeout(() => (this.toast = null), 2800);
  }

  //wandelt HTTP Fehler in lesbare Fehlermeldung um 
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
