import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

export interface ExerciseDto {
  id: number;
  name: string;
  category: string;
  muscleGroups: string;
  description?: string;
}

type ExerciseFormModel = {
  name: string;
  category: string;
  muscleGroups: string;
  description: string;
};

type ExercisePayload = {
  name: string;
  category: string;
  muscleGroups: string;
  description: string;
};

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercises.html',
  styleUrls: ['./exercises.css'],
})
export class Exercises implements OnInit {
  exercises: ExerciseDto[] = [];
  filteredExerciseOverview: ExerciseDto[] = [];
  exerciseOverviewSearch = '';

  form: ExerciseFormModel = {
    name: '',
    category: '',
    muscleGroups: '',
    description: '',
  };

  editForm: ExerciseFormModel = {
    name: '',
    category: '',
    muscleGroups: '',
    description: '',
  };

  loading = false;
  submitting = false;
  saving = false;

  error: string | null = null;
  info: string | null = null;

  selectedExercise: ExerciseDto | null = null;

  private readonly baseUrl = environment.apiBaseUrl;

  private static readonly CREATE_SUCCESS_MESSAGE = 'Übung wurde angelegt.';
  private static readonly UPDATE_SUCCESS_MESSAGE = 'Übung wurde aktualisiert.';
  private static readonly LOAD_ERROR_MESSAGE = 'Fehler beim Laden der Übungen.';
  private static readonly CREATE_ERROR_MESSAGE = 'Fehler beim Anlegen der Übung.';
  private static readonly UPDATE_ERROR_MESSAGE = 'Aktualisieren der Übung ist fehlgeschlagen.';
  private static readonly UNAUTHORIZED_MESSAGE = 'Nicht berechtigt. Bitte erneut anmelden.';
  private static readonly DUPLICATE_MESSAGE = 'Eine Übung mit diesem Namen existiert bereits.';
  private static readonly LOGIN_REQUIRED_CREATE_MESSAGE = 'Bitte anmelden, um Übungen anzulegen.';
  private static readonly LOGIN_REQUIRED_UPDATE_MESSAGE = 'Bitte anmelden, um Übungen zu bearbeiten.';
  private static readonly LOGIN_REQUIRED_DELETE_MESSAGE = 'Bitte anmelden, um Übungen zu löschen.';
  private static readonly REQUIRED_FIELDS_MESSAGE = 'Bitte Name, Kategorie und Muskelgruppen angeben.';
  private static readonly UNKNOWN_CATEGORY_MESSAGE = 'Kategorie unbekannt';

  constructor(
    private http: HttpClient,
    private session: AuthSessionService
  ) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  get isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  onExerciseOverviewSearchChange(): void {
    this.applyFilter();
  }

  addExercise(form?: NgForm): void {
    if (!this.isLoggedIn) {
      this.setError(Exercises.LOGIN_REQUIRED_CREATE_MESSAGE);
      return;
    }

    const payload = this.buildPayloadFromForm(this.form);
    if (!payload) {
      this.setError(Exercises.REQUIRED_FIELDS_MESSAGE);
      return;
    }

    this.submitting = true;
    this.clearMessages();

    this.http.post<ExerciseDto>(`${this.baseUrl}/exercises`, payload).subscribe({
      next: () => {
        this.info = Exercises.CREATE_SUCCESS_MESSAGE;
        this.submitting = false;
        this.resetCreateForm(form);
        this.loadExercises();
      },
      error: (err) => {
        this.setError(this.resolveWriteErrorMessage(err, Exercises.CREATE_ERROR_MESSAGE));
        this.submitting = false;
      },
    });
  }

  selectExercise(ex: ExerciseDto): void {
    this.selectedExercise = ex;
    this.editForm = this.mapExerciseToForm(ex);
    this.clearMessages();
  }

  resetSelection(): void {
    this.selectedExercise = null;
    this.editForm = this.createEmptyForm();
  }

  saveSelected(): void {
    if (!this.isLoggedIn) {
      this.setError(Exercises.LOGIN_REQUIRED_UPDATE_MESSAGE);
      return;
    }

    const selected = this.selectedExercise;
    if (!selected) return;

    const payload = this.buildPayloadFromForm(this.editForm);
    if (!payload) {
      this.setError(Exercises.REQUIRED_FIELDS_MESSAGE);
      return;
    }

    this.saving = true;
    this.clearMessages();

    this.http.put<ExerciseDto>(`${this.baseUrl}/exercises/${selected.id}`, payload).subscribe({
      next: () => {
        this.info = Exercises.UPDATE_SUCCESS_MESSAGE;
        this.saving = false;
        this.loadExercises();
      },
      error: (err) => {
        this.setError(this.resolveWriteErrorMessage(err, Exercises.UPDATE_ERROR_MESSAGE));
        this.saving = false;
      },
    });
  }

  deleteExercise(ex: ExerciseDto, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.isLoggedIn) {
      this.setError(Exercises.LOGIN_REQUIRED_DELETE_MESSAGE);
      return;
    }

    if (!window.confirm(`Möchtest du "${ex.name}" wirklich löschen?`)) return;

    this.http.delete(`${this.baseUrl}/exercises/${ex.id}`).subscribe({
      next: () => this.loadExercises(),
      error: (err) => {
        this.setError(this.resolveDeleteErrorMessage(err, ex.name));
      },
    });
  }

  trackByExercise = (_: number, ex: ExerciseDto) => ex.id;

  private loadExercises(): void {
    this.loading = true;
    this.error = null;

    this.http.get<unknown>(`${this.baseUrl}/exercises`).subscribe({
      next: (res) => {
        this.exercises = this.normalizeExercisesArray(res);
        this.applyFilter();
        this.loading = false;
        this.ensureSelectedExerciseStillExists();
      },
      error: () => {
        this.setError(Exercises.LOAD_ERROR_MESSAGE);
        this.loading = false;
      },
    });
  }

  private ensureSelectedExerciseStillExists(): void {
    if (!this.selectedExercise) return;
    const stillExists = this.exercises.some((e) => e.id === this.selectedExercise?.id);
    if (!stillExists) this.resetSelection();
  }

  private normalizeExercisesArray(res: unknown): ExerciseDto[] {
    const embedded = this.tryGetEmbeddedArray(res, 'exercises');
    if (embedded) return embedded;

    const candidates = this.tryGetArrayByKeys(res, ['content', 'items', 'data']);
    if (candidates) return candidates;

    if (Array.isArray(res)) return res as ExerciseDto[];
    if (this.isSingleExercise(res)) return [res as ExerciseDto];

    return [];
  }

  private tryGetArrayByKeys(res: unknown, keys: string[]): ExerciseDto[] | null {
    if (!res || typeof res !== 'object') return null;
    const obj = res as any;

    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value)) return value as ExerciseDto[];
    }

    return null;
  }

  private tryGetEmbeddedArray(res: unknown, embeddedKey: string): ExerciseDto[] | null {
    if (!res || typeof res !== 'object') return null;
    const obj = res as any;
    const embedded = obj?._embedded?.[embeddedKey];
    return Array.isArray(embedded) ? (embedded as ExerciseDto[]) : null;
  }

  private isSingleExercise(res: unknown): boolean {
    if (!res || typeof res !== 'object') return false;
    const obj = res as any;
    return obj.id != null && obj.name != null;
  }

  private applyFilter(): void {
    const term = this.exerciseOverviewSearch.trim().toLowerCase();

    if (!term) {
      this.filteredExerciseOverview = [...this.exercises];
      return;
    }

    this.filteredExerciseOverview = this.exercises.filter((exercise) => this.matchesSearchTerm(exercise, term));
  }

  private matchesSearchTerm(exercise: ExerciseDto, term: string): boolean {
    const name = exercise.name?.toLowerCase() ?? '';
    const category = exercise.category?.toLowerCase() ?? '';
    const muscles = exercise.muscleGroups?.toLowerCase() ?? '';
    const description = exercise.description?.toLowerCase() ?? '';
    return name.includes(term) || category.includes(term) || muscles.includes(term) || description.includes(term);
  }

  private buildPayloadFromForm(form: ExerciseFormModel): ExercisePayload | null {
    const name = form.name.trim();
    const category = form.category.trim();
    const muscleGroups = form.muscleGroups.trim();
    const description = (form.description ?? '').trim();

    if (!name || !category || !muscleGroups) return null;

    return {
      name,
      category,
      muscleGroups,
      description,
    };
  }

  private mapExerciseToForm(exercise: ExerciseDto): ExerciseFormModel {
    return {
      name: exercise.name ?? '',
      category: exercise.category ?? Exercises.UNKNOWN_CATEGORY_MESSAGE,
      muscleGroups: exercise.muscleGroups ?? '',
      description: exercise.description ?? '',
    };
  }

  private createEmptyForm(): ExerciseFormModel {
    return {
      name: '',
      category: '',
      muscleGroups: '',
      description: '',
    };
  }

  private resetCreateForm(form?: NgForm): void {
    this.form = this.createEmptyForm();
    form?.resetForm();
  }

  private resolveWriteErrorMessage(err: any, fallback: string): string {
    const status = Number(err?.status ?? 0);

    if (status === 401 || status === 403) return Exercises.UNAUTHORIZED_MESSAGE;
    if (status === 409) return Exercises.DUPLICATE_MESSAGE;

    return fallback;
  }

  private resolveDeleteErrorMessage(err: any, exerciseName: string): string {
    const status = Number(err?.status ?? 0);

    if (status === 401 || status === 403) return Exercises.UNAUTHORIZED_MESSAGE;

    return `Fehler beim Löschen von "${exerciseName}".`;
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
