import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environment';

type AnyObj = Record<string, any>;

interface PublicSessionDto {
  id: number;
  name?: string;
  title?: string;
  days?: number[];
  exercisesCount?: number;
  performedCount?: number;
  exercises?: any[];
  exerciseExecutions?: any[];
}

interface PublicPlanDto {
  id: number;
  name: string;
  description?: string;
  sessionsCount?: number;

  // UI state
  sessions?: PublicSessionDto[];
  sessionsLoaded?: boolean;
  loadingSessions?: boolean;
}

@Component({
  selector: 'app-plans-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans-public.html',
  styleUrls: ['./plans-public.css'],
})
export class PlansPublic implements OnInit {
  private readonly baseUrl = environment.apiBaseUrl;

  plans: PublicPlanDto[] = [];
  selectedPlan: PublicPlanDto | null = null;

  loading = false;

  error: string | null = null;
  info: string | null = null;

  // Live Suche
  query = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  //  Live gefilterte Pläne
  get filteredPlans(): PublicPlanDto[] {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) return this.plans;

    return this.plans.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const sessionsCount = String(p.sessionsCount ?? '');
      return name.includes(q) || desc.includes(q) || sessionsCount.includes(q);
    });
  }

  private loadPlans(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.baseUrl}/training-plans`).subscribe({
      next: (res) => {
        const items = this.normalizeArray(res);

        this.plans = items.map((p: AnyObj): PublicPlanDto => ({
          id: Number(p['id']),
          name: String(p['name'] ?? ''),
          description: p['description'] != null ? String(p['description']) : undefined,
          sessionsCount: (p['sessionsCount'] ??
            (Array.isArray(p['sessions']) ? p['sessions'].length : 0)) as number,
        }));

        // falls der vorher ausgewählte Plan nicht mehr existiert
        if (this.selectedPlan) {
          const stillThere = this.plans.find((x) => x.id === this.selectedPlan!.id) || null;
          this.selectedPlan = stillThere;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden der Trainingspläne.';
        this.loading = false;
      },
    });
  }

  selectPlan(p: PublicPlanDto): void {
    this.selectedPlan = p;
    this.error = null;
    this.info = null;

    // Sessions nur einmal laden
    if (p.sessionsLoaded) return;

    p.loadingSessions = true;

    this.http
      .get<any>(`${this.baseUrl}/training-sessions`, {
        params: { planId: String(p.id) },
      })
      .subscribe({
        next: (res) => {
          const sessions = this.normalizeArray(res) as PublicSessionDto[];

          // optional: sort by name/title for stable UI
          const sorted = (sessions ?? []).slice().sort((a: any, b: any) => {
            const an = String(a?.title ?? a?.name ?? '').toLowerCase();
            const bn = String(b?.title ?? b?.name ?? '').toLowerCase();
            return an.localeCompare(bn);
          });

          p.sessions = sorted;
          p.sessionsLoaded = true;
          p.loadingSessions = false;

          p.sessionsCount = p.sessionsCount ?? sorted.length ?? 0;
        },
        error: (err) => {
          console.error(err);
          p.loadingSessions = false;
        },
      });
  }

  resetSelection(): void {
    this.selectedPlan = null;
  }

  formatDays(days: number[] | undefined): string {
    if (!days || !days.length) return '–';
    return [...days].sort((a, b) => a - b).join(', ');
  }

  private normalizeArray(res: any): AnyObj[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as AnyObj[];
    if (Array.isArray(res.content)) return res.content as AnyObj[];
    if (Array.isArray(res.items)) return res.items as AnyObj[];
    if (Array.isArray(res.data)) return res.data as AnyObj[];
    return [];
  }

  trackByPlan = (_: number, p: PublicPlanDto) => p.id;
  trackBySession = (_: number, s: PublicSessionDto) => s.id;
}
