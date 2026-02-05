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
  private readonly API_URL = `${environment.apiBaseUrl}/exercises`;

  // Data State
  exercises: ExerciseDto[] = [];
  filteredExercises: ExerciseDto[] = [];
  selectedExercise: ExerciseDto | null = null;
  
  // UI State
  searchQuery = '';
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.fetchExercises();
  }

  // --- Event Handlers ---

  onSearchChange(): void {
    this.filterExercises();
  }

  selectExercise(exercise: ExerciseDto): void {
    this.selectedExercise = exercise;
    this.errorMessage = null;
  }

  resetSelection(): void {
    this.selectedExercise = null;
  }

  trackByExercise(_index: number, exercise: ExerciseDto): number {
    return exercise.id;
  }

  // --- Private Logic ---

  private fetchExercises(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<unknown>(this.API_URL).subscribe({
      next: (response) => this.handleSuccess(response),
      error: () => this.handleError('Fehler beim Laden der Übungen.'),
    });
  }

  private handleSuccess(response: unknown): void {
    this.exercises = this.normalizeResponse(response);
    this.filterExercises();
    this.isLoading = false;
    this.validateSelection();
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    this.isLoading = false;
  }

  private filterExercises(): void {
    const term = (this.searchQuery || '').trim().toLowerCase();

    if (!term) {
      this.filteredExercises = [...this.exercises];
      return;
    }

    this.filteredExercises = this.exercises.filter((exercise) =>
      this.matchesSearch(exercise, term)
    );
  }

  private matchesSearch(exercise: ExerciseDto, term: string): boolean {
    const name = (exercise.name || '').toLowerCase();
    const category = (exercise.category || '').toLowerCase();
    const muscles = (exercise.muscleGroups || '').toLowerCase();
    const description = (exercise.description || '').toLowerCase();

    return (
      name.includes(term) ||
      category.includes(term) ||
      muscles.includes(term) ||
      description.includes(term)
    );
  }

  private validateSelection(): void {
    if (this.selectedExercise) {
      const stillExists = this.exercises.some((e) => e.id === this.selectedExercise!.id);
      if (!stillExists) {
        this.resetSelection();
      }
    }
  }

  /**
   * Normalizes various API response formats (Spring Page, HAL, List)
   */
  private normalizeResponse(response: any): ExerciseDto[] {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    
    // Support common wrapper structures
    return (
      response.content ||
      response.items ||
      response.data ||
      response._embedded?.exercises ||
      (response.id ? [response] : [])
    );
  }
}
