import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../../../environment';
import { AuthSessionService } from '../../services/auth-session.service';

export interface ExerciseDto {
  id: number;
  name: string;
  category: string;
  muscleGroups: string;
  description?: string;
}

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercises.html',
  styleUrls: ['./exercises.css'],
})
export class Exercises implements OnInit {
  baseUrl = environment.apiBaseUrl;

  exercises: ExerciseDto[] = [];
  filteredExerciseOverview: ExerciseDto[] = [];
  exerciseOverviewSearch = '';

  // Formular für das Neu anlegen von Übungen
  form = {
    name: '',
    category: '',
    muscleGroups: '',
    description: '',
  };

  // Formular für das Bearbeiten von Übungen
  editForm: {
    name: string;
    category: string;
    muscleGroups: string;
    description: string;
  } = {
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

  constructor(private http: HttpClient, private session: AuthSessionService) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  // Sprint 4: UI-Status "eingeloggt"
  get isLoggedIn(): boolean {
    return this.session.isLoggedIn();
  }

  // Übungsliste wird vom Backend geladen
  private loadExercises(): void {
    this.loading = true;
    this.error = null;

    // GET /exercises Request an Backend (öffentlich)
    this.http.get<any>(`${this.baseUrl}/exercises`).subscribe({
      next: (res) => {
        this.exercises = this.normalizeExercisesArray(res);
        this.applyFilter();
        this.loading = false;

        // Falls ausgewählte Übung nicht mehr existiert: Auswahl resetten
        if (this.selectedExercise) {
          const stillExists = this.exercises.some((e) => e.id === this.selectedExercise?.id);
          if (!stillExists) this.resetSelection();
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden der Übungen.';
        this.loading = false;
      },
    });
  }

  // Vereinheitlicht verschiedene Backend Antworten zu einem ExerciseDto
  private normalizeExercisesArray(res: any): ExerciseDto[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.content)) return res.content;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res._embedded?.exercises)) return res._embedded.exercises;
    if (res && typeof res === 'object' && res.id != null) return [res];
    return [];
  }

  onExerciseOverviewSearchChange(): void {
    this.applyFilter();
  }

  // Übungsliste anhand des Suchbegriffs filtern
  private applyFilter(): void {
    const term = this.exerciseOverviewSearch.trim().toLowerCase();

    if (!term) {
      this.filteredExerciseOverview = [...this.exercises];
      return;
    }

    this.filteredExerciseOverview = this.exercises.filter((e) => {
      const name = e.name?.toLowerCase() ?? '';
      const cat = e.category?.toLowerCase() ?? '';
      const muscles = e.muscleGroups?.toLowerCase() ?? '';
      const desc = e.description?.toLowerCase() ?? '';
      return name.includes(term) || cat.includes(term) || muscles.includes(term) || desc.includes(term);
    });
  }

  addExercise(form?: NgForm): void {
    // Sprint 4: Schreiben nur mit Login
    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Übungen anzulegen.';
      return;
    }

    const name = this.form.name.trim();
    const category = this.form.category.trim();
    const muscles = this.form.muscleGroups.trim();
    const description = this.form.description?.trim() ?? '';

    if (!name || !category || !muscles) {
      this.error = 'Bitte Name, Kategorie und Muskelgruppen angeben.';
      return;
    }

    this.submitting = true;
    this.error = null;
    this.info = null;

    const dto = { name, category, muscleGroups: muscles, description };

    // POST /exercises Request an Backend (geschützt)
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
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else if (err.status === 409) {
          this.error = 'Eine Übung mit diesem Namen existiert bereits.';
        } else {
          this.error = 'Fehler beim Anlegen der Übung.';
        }
        this.submitting = false;
      },
    });
  }

  // Übung auswählen (Details ansehen – öffentlich ok)
  selectExercise(ex: ExerciseDto): void {
    this.selectedExercise = ex;

    // editForm füllen (auch wenn nicht eingeloggt -> nur readonly angezeigt)
    this.editForm = {
      name: ex.name ?? '',
      category: ex.category ?? '',
      muscleGroups: ex.muscleGroups ?? '',
      description: ex.description ?? '',
    };

    this.info = null;
    this.error = null;
  }

  resetSelection(): void {
    this.selectedExercise = null;
    this.editForm = { name: '', category: '', muscleGroups: '', description: '' };
  }

  saveSelected(): void {
    // Sprint 4: Schreiben nur mit Login
    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Übungen zu bearbeiten.';
      return;
    }
    if (!this.selectedExercise) return;

    const name = this.editForm.name.trim();
    const category = this.editForm.category.trim();
    const muscles = this.editForm.muscleGroups.trim();
    const description = this.editForm.description?.trim() ?? '';

    if (!name || !category || !muscles) {
      this.error = 'Bitte Name, Kategorie und Muskelgruppen angeben.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.info = null;

    const dto = { name, category, muscleGroups: muscles, description };

    // PUT /exercises/{id} (geschützt)
    this.http.put<ExerciseDto>(`${this.baseUrl}/exercises/${this.selectedExercise.id}`, dto).subscribe({
      next: () => {
        this.info = 'Übung wurde aktualisiert.';
        this.saving = false;
        this.loadExercises();
      },
      error: (err) => {
        console.error(err);
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else if (err.status === 409) {
          this.error = 'Eine Übung mit diesem Namen existiert bereits.';
        } else {
          this.error = 'Aktualisieren der Übung ist fehlgeschlagen.';
        }
        this.saving = false;
      },
    });
  }

  deleteExercise(ex: ExerciseDto, event?: MouseEvent): void {
    event?.stopPropagation();

    // Sprint 4: Schreiben nur mit Login
    if (!this.isLoggedIn) {
      this.error = 'Bitte anmelden, um Übungen zu löschen.';
      return;
    }

    if (!window.confirm(`Möchtest du "${ex.name}" wirklich löschen?`)) return;

    // DELETE /exercises/{id} (geschützt)
    this.http.delete(`${this.baseUrl}/exercises/${ex.id}`).subscribe({
      next: () => this.loadExercises(),
      error: (err) => {
        console.error(err);
        if (err.status === 401 || err.status === 403) {
          this.error = 'Nicht berechtigt. Bitte erneut anmelden.';
        } else {
          this.error = `Fehler beim Löschen von "${ex.name}".`;
        }
      },
    });
  }

  trackByExercise = (_: number, ex: ExerciseDto) => ex.id;
}
