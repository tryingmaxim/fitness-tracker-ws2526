import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environment';

// --- Interfaces (DTOs) ---

export interface ExerciseDTO {
  id: number;
  name: string;
}

export interface ExerciseExecutionDTO {
  orderIndex?: number;
  exercise?: ExerciseDTO;
  exerciseName?: string; // Fallback für manche API-Antworten
  notes?: string;
}

export interface PublicSessionDto {
  id: number;
  name?: string;
  title?: string;
  days?: number[];
  exercisesCount?: number;
  performedCount?: number;
  exercises?: any[]; // Legacy Support
  exerciseExecutions?: ExerciseExecutionDTO[];
}

export interface PublicPlanDto {
  id: number;
  name: string;
  description?: string;
  sessionsCount?: number;

  // UI State
  sessions?: PublicSessionDto[];
  sessionsLoaded?: boolean;
  loadingSessions?: boolean;
}

@Component({
  selector: 'app-plans-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans-public.html',
  styleUrls: ['../plans/plans.css', './plans-public.css'],
})
export class PlansPublic implements OnInit {
  // Constants
  private readonly API_PLANS = `${environment.apiBaseUrl}/training-plans`;
  private readonly API_SESSIONS = `${environment.apiBaseUrl}/training-sessions`;

  // State
  plans: PublicPlanDto[] = [];
  selectedPlan: PublicPlanDto | null = null;
  
  // Renamed to match HTML from previous step
  isLoading = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  // Search
  searchQuery = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.fetchPlans();
  }

  // --- Computed Properties ---

  get filteredPlans(): PublicPlanDto[] {
    const term = (this.searchQuery || '').trim().toLowerCase();
    
    if (!term) {
      return this.plans;
    }

    return this.plans.filter((plan) => this.matchesSearch(plan, term));
  }

  // --- User Actions ---

  selectPlan(plan: PublicPlanDto): void {
    this.selectedPlan = plan;
    this.errorMessage = null;
    this.infoMessage = null;

    // Caching: Sessions nur laden, wenn noch nicht vorhanden
    if (plan.sessionsLoaded) {
      return;
    }

    this.fetchSessionsForPlan(plan);
  }

  resetSelection(): void {
    this.selectedPlan = null;
  }

  // --- Template Helpers ---

  formatDays(days?: number[]): string {
    if (!days || days.length === 0) {
      return '–';
    }
    return [...days].sort((a, b) => a - b).join(', ');
  }

  getExerciseCount(session: PublicSessionDto): number {
    return session.exercisesCount 
      ?? session.exercises?.length 
      ?? session.exerciseExecutions?.length 
      ?? 0;
  }

  getExerciseName(execution: ExerciseExecutionDTO): string {
    return execution.exercise?.name 
      ?? execution.exerciseName 
      ?? 'Unbenannte Übung';
  }

  hasSessions(plan: PublicPlanDto): boolean {
    return (plan.sessions?.length ?? 0) > 0;
  }

  trackByPlan(_index: number, plan: PublicPlanDto): number {
    return plan.id;
  }

  trackBySession(_index: number, session: PublicSessionDto): number {
    return session.id;
  }

  // --- Private Logic (Data & API) ---

  private fetchPlans(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<unknown>(this.API_PLANS).subscribe({
      next: (response) => this.handlePlansSuccess(response),
      error: (err) => this.handleError(err, 'Fehler beim Laden der Trainingspläne.'),
    });
  }

  private handlePlansSuccess(response: unknown): void {
    const rawItems = this.normalizeArray(response);

    this.plans = rawItems.map((item) => this.mapToPlanDto(item));

    this.restoreSelection();
    this.isLoading = false;
  }

  private fetchSessionsForPlan(plan: PublicPlanDto): void {
    plan.loadingSessions = true;

    this.http.get<unknown>(this.API_SESSIONS, { params: { planId: String(plan.id) } }).subscribe({
      next: (response) => {
        const sessions = this.normalizeArray(response);
        plan.sessions = this.sortSessions(sessions);
        plan.sessionsLoaded = true;
        plan.loadingSessions = false;
        
        // Update count if inconsistent
        if (!plan.sessionsCount && plan.sessions.length > 0) {
          plan.sessionsCount = plan.sessions.length;
        }
      },
      error: (err) => {
        console.error(err);
        this.infoMessage = `Sessions für "${plan.name}" konnten nicht geladen werden.`;
        plan.loadingSessions = false;
      }
    });
  }

  private handleError(error: any, fallbackMsg: string): void {
    console.error(error); // In Prod entfernen oder Logger nutzen
    this.errorMessage = fallbackMsg;
    this.isLoading = false;
  }

  // --- Mappers & Helpers ---

  private normalizeArray(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    return res.content || res.items || res.data || [];
  }

  private mapToPlanDto(item: any): PublicPlanDto {
    return {
      id: Number(item.id),
      name: item.name,
      description: item.description,
      sessionsCount: item.sessionsCount ?? item.sessions?.length ?? 0,
      sessions: [],
      sessionsLoaded: false,
      loadingSessions: false
    };
  }

  private sortSessions(sessions: any[]): PublicSessionDto[] {
    // Sortiere nach ID oder Index, falls vorhanden
    return sessions.map(s => ({
      id: s.id,
      name: s.name,
      title: s.title,
      days: s.days,
      exercisesCount: s.exercisesCount,
      performedCount: s.performedCount,
      exerciseExecutions: s.exerciseExecutions
    })).sort((a, b) => a.id - b.id);
  }

  private restoreSelection(): void {
    if (this.selectedPlan) {
      this.selectedPlan = this.plans.find(p => p.id === this.selectedPlan!.id) || null;
    }
  }

  private matchesSearch(plan: PublicPlanDto, term: string): boolean {
    const name = (plan.name || '').toLowerCase();
    const desc = (plan.description || '').toLowerCase();
    return name.includes(term) || desc.includes(term);
  }
}