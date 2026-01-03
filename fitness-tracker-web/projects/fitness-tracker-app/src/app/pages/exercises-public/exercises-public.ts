import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';

export interface ExerciseDto {
  id: number;
  name: string;
  category: string;
  muscleGroups: string;
  description?: string;
}

@Component({
  selector: 'app-exercises-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercises-public.html',
  styleUrls: ['./exercises-public.css'],
})
export class ExercisesPublic implements OnInit {
  baseUrl = environment.apiBaseUrl;

  exercises: ExerciseDto[] = [];
  filteredExerciseOverview: ExerciseDto[] = [];
  exerciseOverviewSearch = '';

  loading = false;
  error: string | null = null;

  selectedExercise: ExerciseDto | null = null;

  // nur Anzeige (für Details Panel rechts)
  viewModel = {
    name: '',
    category: '',
    muscleGroups: '',
    description: '',
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  private loadExercises(): void {
    this.loading = true;
    this.error = null;

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

  selectExercise(ex: ExerciseDto): void {
    this.selectedExercise = ex;

    this.viewModel = {
      name: ex.name ?? '',
      category: ex.category ?? '',
      muscleGroups: ex.muscleGroups ?? '',
      description: ex.description ?? '',
    };

    this.error = null;
  }

  resetSelection(): void {
    this.selectedExercise = null;
    this.viewModel = { name: '', category: '', muscleGroups: '', description: '' };
  }

  trackByExercise = (_: number, ex: ExerciseDto) => ex.id;
}
