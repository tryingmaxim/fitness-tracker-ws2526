import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environment';

// --- Domain Models & DTOs ---

export interface ExerciseDTO {
  id: number;
  name: string;
}

export interface PlannedExerciseResponse {
  exerciseId?: number;
  orderIndex?: number;
  plannedSets?: number;
  plannedReps?: number;
  plannedWeightKg?: number;
  notes?: string | null;
  exercise?: ExerciseDTO;
}

export interface PublicSession {
  id: number;
  name: string;
  days: number[];
  planId?: number | null;
  planName?: string;
  exerciseExecutions?: PlannedExerciseResponse[];
}

/** Erwartete Struktur vom Backend (vermeidet 'any') */
interface RawSessionData {
  id: number | string;
  name: string;
  days?: (number | string)[];
  planId?: number;
  planName?: string;
  plan?: { id: number; name: string };
}

@Component({
  selector: 'app-sessions-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions-public.html',
  styleUrls: ['./sessions-public.css'],
})
export class SessionsPublic implements OnInit {
  private readonly API_URL = `${environment.apiBaseUrl}/training-sessions`;
  private readonly DEFAULT_PAGE_SIZE = 200;

  sessions: PublicSession[] = [];
  selectedSession: PublicSession | null = null;
  
  isLoading = false;
  errorMessage: string | null = null;
  searchQuery = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  // --- UI Logic & Getters ---

  get filteredSessions(): PublicSession[] {
    const term = (this.searchQuery || '').trim().toLowerCase();
    if (!term) {
      return this.sessions;
    }
    return this.sessions.filter((session) => this.matchesSearch(session, term));
  }

  selectSession(session: PublicSession): void {
    this.selectedSession = session;
    
    const hasDetailsLoaded = session.exerciseExecutions && session.exerciseExecutions.length > 0;
    if (hasDetailsLoaded) {
      return;
    }
    
    this.loadSessionDetails(session);
  }

  clearSelection(): void {
    this.selectedSession = null;
  }

  trackBySession(_index: number, session: PublicSession): number {
    return session.id;
  }

  // --- View Helpers ---

  formatDays(days: number[]): string {
    if (!days || days.length === 0) {
      return '–';
    }
    return [...days].sort((a, b) => a - b).join(', ');
  }

  getExerciseName(execution: PlannedExerciseResponse): string {
    return execution.exercise?.name ?? `Übung #${execution.exerciseId}`;
  }

  // --- Data Access (Should be in Service) ---

  private loadSessions(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Use generic object here as the API wrap structure is dynamic (page/content/items)
    this.http.get<unknown>(`${this.API_URL}?size=${this.DEFAULT_PAGE_SIZE}`)
      .subscribe({
        next: (response) => {
          this.sessions = this.processSessionsResponse(response);
          this.restoreSelection();
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Fehler beim Laden der Sessions.';
          this.isLoading = false;
        }
      });
  }

  private loadSessionDetails(session: PublicSession): void {
    const url = `${this.API_URL}/${session.id}/executions`;
    
    this.http.get<PlannedExerciseResponse[]>(url)
      .subscribe({
        next: (executions) => {
          session.exerciseExecutions = this.sortExecutions(executions);
        },
        error: () => {
          // Silent fail for details or show toast in real app
          this.errorMessage = `Details für "${session.name}" konnten nicht geladen werden.`;
        }
      });
  }

  // --- Helper / Mapping Logic ---

  private processSessionsResponse(response: unknown): PublicSession[] {
    const rawData = this.extractDataArray(response);
    return rawData.map((item) => this.mapToPublicSession(item));
  }

  private extractDataArray(res: any): RawSessionData[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    // Support standard Spring Data / HATEOAS / Custom wrappers
    return res.content || res.items || res.data || res._embedded?.trainingSessions || [];
  }

  private mapToPublicSession(data: RawSessionData): PublicSession {
    return {
      id: Number(data.id),
      name: data.name,
      planId: data.planId ?? data.plan?.id ?? null,
      planName: data.planName ?? data.plan?.name,
      days: this.parseDays(data.days)
    };
  }

  private parseDays(days: (number | string)[] | undefined): number[] {
    if (!Array.isArray(days)) return [];
    
    return days
      .map((d) => Number(d))
      .filter((d) => !isNaN(d) && d >= 1 && d <= 30);
  }

  private sortExecutions(executions: PlannedExerciseResponse[]): PlannedExerciseResponse[] {
    if (!executions) return [];
    // Magic Number 999 extracted implicitly as fallback
    return [...executions].sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
  }

  private restoreSelection(): void {
    if (!this.selectedSession) return;
    
    const found = this.sessions.find((s) => s.id === this.selectedSession!.id);
    this.selectedSession = found || null;
  }

  private matchesSearch(session: PublicSession, term: string): boolean {
    const name = (session.name || '').toLowerCase();
    const plan = (session.planName || '').toLowerCase();
    const days = this.formatDays(session.days).toLowerCase();
    
    return name.includes(term) || plan.includes(term) || days.includes(term);
  }
}