// src/app/private/exercises/exercises.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environment';

export interface ExerciseDto {
  id: number;
  name: string;
  category: string;
  description?: string;
  muscleGroups: string;
}

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './exercises.html',
  styleUrls: ['./exercises.css'],
})
export class Exercises implements OnInit {
  baseUrl = environment.apiBaseUrl;

  exercises: ExerciseDto[] = [];

  // Form für neue Übung
  form = {
    name: '',
    category: '',
    muscleGroups: '',
    description: '',
  };

  // Form für Bearbeitung
  editForm = {
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

  editErrors: { name?: string; category?: string; muscleGroups?: string } = {};

  selectedExercise: ExerciseDto | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  /** Übungen vom Backend laden */
  private loadExercises(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.baseUrl}/exercises`).subscribe({
      next: (res) => {
        this.exercises = this.normalizeExercisesArray(res);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden der Übungen.';
        this.loading = false;
      },
    });
  }

  /** Helfer: verschiedene mögliche Spring-Page-Formate normalisieren */
  private normalizeExercisesArray(res: any): ExerciseDto[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.content)) return res.content;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    if (res._embedded?.exercises && Array.isArray(res._embedded.exercises)) {
      return res._embedded.exercises;
    }
    if (typeof res === 'object' && res.id != null) return [res];
    return [];
  }

  /** Neue Übung anlegen */
  addExercise(form?: NgForm): void {
    const trimmedName = this.form.name.trim();
    const trimmedCategory = this.form.category.trim();
    const trimmedMuscles = this.form.muscleGroups.trim();

    if (!trimmedName || !trimmedCategory || !trimmedMuscles) {
      this.error = 'Bitte Name, Kategorie und Muskelgruppen angeben.';
      return;
    }

    this.submitting = true;
    this.error = null;
    this.info = null;

    const dto = {
      name: trimmedName,
      category: trimmedCategory,
      muscleGroups: trimmedMuscles,
      description: this.form.description?.trim() || '',
    };

    this.http.post<ExerciseDto>(`${this.baseUrl}/exercises`, dto).subscribe({
      next: () => {
        this.info = 'Übung wurde angelegt.';
        this.submitting = false;
        this.form = { name: '', category: '', muscleGroups: '', description: '' };
        form?.resetForm();
        this.loadExercises();
      },
      error: (err) => {
        console.error(err);
        if (err.status === 409) {
          this.error = 'Eine Übung mit diesem Namen existiert bereits.';
        } else {
          this.error = 'Fehler beim Anlegen der Übung.';
        }
        this.submitting = false;
      },
    });
  }

  /** Übung auswählen & Edit-Form füllen */
  selectExercise(ex: ExerciseDto): void {
    this.selectedExercise = ex;
    this.editForm = {
      name: ex.name ?? '',
      category: ex.category ?? '',
      muscleGroups: ex.muscleGroups ?? '',
      description: ex.description ?? '',
    };
    this.editErrors = {};
    this.info = null;
  }

  resetSelection(): void {
    this.selectedExercise = null;
    this.editForm = {
      name: '',
      category: '',
      muscleGroups: '',
      description: '',
    };
    this.editErrors = {};
  }

  /** Änderungen speichern */
  saveSelected(): void {
    if (!this.selectedExercise) return;

    const name = this.editForm.name?.trim();
    const category = this.editForm.category?.trim();
    const muscles = this.editForm.muscleGroups?.trim();

    this.editErrors = {};
    if (!name) this.editErrors.name = 'Der Name darf nicht leer sein.';
    if (!category) this.editErrors.category = 'Bitte eine Kategorie angeben.';
    if (!muscles) this.editErrors.muscleGroups = 'Bitte Muskelgruppen angeben.';

    if (Object.keys(this.editErrors).length > 0) {
      return;
    }

    this.saving = true;
    this.error = null;
    this.info = null;

    const dto = {
      name,
      category,
      muscleGroups: muscles,
      description: this.editForm.description?.trim() || '',
    };

    this.http
      .put<ExerciseDto>(`${this.baseUrl}/exercises/${this.selectedExercise.id}`, dto)
      .subscribe({
        next: (updated) => {
          const payload = updated ?? dto;

          // lokale Referenzen aktualisieren
          this.selectedExercise!.name = payload.name;
          this.selectedExercise!.category = payload.category;
          this.selectedExercise!.muscleGroups = payload.muscleGroups;
          this.selectedExercise!.description = payload.description;

          const item = this.exercises.find((x) => x.id === this.selectedExercise!.id);
          if (item) {
            Object.assign(item, this.selectedExercise);
          }

          this.info = 'Übung wurde aktualisiert.';
          this.saving = false;
        },
        error: (err) => {
          console.error(err);
          if (err.status === 409) {
            this.error = 'Eine Übung mit diesem Namen existiert bereits.';
          } else {
            this.error = 'Aktualisieren der Übung ist fehlgeschlagen.';
          }
          this.saving = false;
        },
      });
  }

  /** Übung löschen */
  deleteExercise(ex: ExerciseDto, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!window.confirm(`Möchtest du "${ex.name}" wirklich löschen?`)) return;

    this.http.delete(`${this.baseUrl}/exercises/${ex.id}`).subscribe({
      next: () => this.loadExercises(),
      error: (err) => {
        console.error(err);
        this.error = `Fehler beim Löschen von "${ex.name}".`;
      },
    });
  }

  trackByExercise = (_: number, ex: ExerciseDto) => ex.id;
}
