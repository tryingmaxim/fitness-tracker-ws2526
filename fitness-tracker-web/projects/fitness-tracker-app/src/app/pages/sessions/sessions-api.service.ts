import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of } from 'rxjs';

import { environment } from '../../../../environment';
import {
  CreateTrainingSessionRequest,
  ExecutionRequest,
  Exercise,
  PlannedExerciseResponse,
  TrainingPlan,
  TrainingSession,
  UpdateTrainingSessionRequest,
} from './sessions.models';

const API_PATH = {
  TRAINING_PLANS: '/training-plans',
  TRAINING_SESSIONS: '/training-sessions',
  EXERCISES: '/exercises',
} as const;

const DEFAULT_QUERY_SIZE = {
  TRAINING_PLANS: 200,
  TRAINING_SESSIONS: 200,
  EXERCISES: 500,
} as const;

const EMBEDDED_KEY = {
  TRAINING_PLANS: 'trainingPlans',
  TRAINING_SESSIONS: 'trainingSessions',
  EXERCISES: 'exercises',
} as const;

@Injectable({ providedIn: 'root' })
export class SessionsApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly httpClient: HttpClient) {}

  getPlans(): Observable<TrainingPlan[]> {
    return this.httpClient
      .get<unknown>(this.buildListUrl(API_PATH.TRAINING_PLANS, DEFAULT_QUERY_SIZE.TRAINING_PLANS))
      .pipe(map((response) => this.mapPlans(this.extractCollection(response, EMBEDDED_KEY.TRAINING_PLANS))));
  }

  getSessions(): Observable<TrainingSession[]> {
    return this.httpClient
      .get<unknown>(this.buildListUrl(API_PATH.TRAINING_SESSIONS, DEFAULT_QUERY_SIZE.TRAINING_SESSIONS))
      .pipe(map((response) => this.mapSessions(this.extractCollection(response, EMBEDDED_KEY.TRAINING_SESSIONS))));
  }

  getExercises(): Observable<Exercise[]> {
    return this.httpClient
      .get<unknown>(this.buildListUrl(API_PATH.EXERCISES, DEFAULT_QUERY_SIZE.EXERCISES))
      .pipe(map((response) => this.mapExercises(this.extractCollection(response, EMBEDDED_KEY.EXERCISES))));
  }

  getExecutions(sessionId: number): Observable<PlannedExerciseResponse[]> {
    return this.httpClient.get<PlannedExerciseResponse[]>(this.buildExecutionsUrl(sessionId));
  }

  getExecutionsForSessions(sessionIds: number[]): Observable<PlannedExerciseResponse[][]> {
    if (!sessionIds.length) return of([]);
    return forkJoin(sessionIds.map((sessionId) => this.getExecutions(sessionId)));
  }

  createSession(payload: CreateTrainingSessionRequest): Observable<{ id: number }> {
    return this.httpClient.post<{ id: number }>(this.buildSessionsUrl(), payload);
  }

  updateSession(sessionId: number, payload: UpdateTrainingSessionRequest): Observable<void> {
    return this.httpClient.put<void>(this.buildSessionUrl(sessionId), payload);
  }

  deleteSession(sessionId: number): Observable<void> {
    return this.httpClient.delete<void>(this.buildSessionUrl(sessionId));
  }

  createExecution(sessionId: number, payload: ExecutionRequest): Observable<unknown> {
    return this.httpClient.post(this.buildExecutionsUrl(sessionId), payload);
  }

  updateExecution(sessionId: number, executionId: number, payload: ExecutionRequest): Observable<unknown> {
    return this.httpClient.patch(this.buildExecutionUrl(sessionId, executionId), payload);
  }

  deleteExecution(sessionId: number, executionId: number): Observable<void> {
    return this.httpClient.delete<void>(this.buildExecutionUrl(sessionId, executionId));
  }

  private buildListUrl(path: string, size: number): string {
    return `${this.baseUrl}${path}?size=${size}`;
  }

  private buildSessionsUrl(): string {
    return `${this.baseUrl}${API_PATH.TRAINING_SESSIONS}`;
  }

  private buildSessionUrl(sessionId: number): string {
    return `${this.baseUrl}${API_PATH.TRAINING_SESSIONS}/${sessionId}`;
  }

  private buildExecutionsUrl(sessionId: number): string {
    return `${this.buildSessionUrl(sessionId)}/executions`;
  }

  private buildExecutionUrl(sessionId: number, executionId: number): string {
    return `${this.buildExecutionsUrl(sessionId)}/${executionId}`;
  }

  private mapPlans(items: unknown[]): TrainingPlan[] {
    return items
      .map((raw) => raw as { id?: unknown; name?: unknown; description?: unknown })
      .filter((plan) => this.isFiniteNumber(plan.id) && typeof plan.name === 'string')
      .map((plan) => ({
        id: Number(plan.id),
        name: String(plan.name),
        description: plan.description != null ? String(plan.description) : undefined,
      }));
  }

  private mapSessions(items: unknown[]): TrainingSession[] {
    return items
      .map((raw) => raw as Record<string, unknown>)
      .filter((session) => this.isFiniteNumber(session['id']) && typeof session['name'] === 'string')
      .map((session) => {
        const planId = this.resolveSessionPlanId(session);
        return {
          id: Number(session['id']),
          name: String(session['name']),
          planId,
          planName: this.resolveSessionPlanName(session),
          days: this.extractValidDays(session['days']),
          exerciseExecutions: [],
        };
      });
  }

  private mapExercises(items: unknown[]): Exercise[] {
    return items
      .map((raw) => raw as Record<string, unknown>)
      .filter((exercise) => this.isFiniteNumber(exercise['id']) && typeof exercise['name'] === 'string')
      .map((exercise) => ({
        id: Number(exercise['id']),
        name: String(exercise['name']),
        category: exercise['category'] != null ? String(exercise['category']) : undefined,
        muscleGroups: exercise['muscleGroups'] != null ? String(exercise['muscleGroups']) : undefined,
      }));
  }

  private resolveSessionPlanId(session: Record<string, unknown>): number | null {
    const direct = session['planId'];
    if (direct != null && this.isFiniteNumber(direct)) return Number(direct);

    const plan = session['plan'] as Record<string, unknown> | undefined;
    const nested = plan?.['id'];
    if (nested != null && this.isFiniteNumber(nested)) return Number(nested);

    return null;
  }

  private resolveSessionPlanName(session: Record<string, unknown>): string | undefined {
    const direct = session['planName'];
    if (typeof direct === 'string' && direct.trim()) return direct;

    const plan = session['plan'] as Record<string, unknown> | undefined;
    const nested = plan?.['name'];
    if (typeof nested === 'string' && nested.trim()) return nested;

    return undefined;
  }

  private extractValidDays(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v) => Number(v))
      .filter((day) => Number.isFinite(day) && day >= 1 && day <= 30);
  }

  private extractCollection(response: unknown, embeddedKey: string): unknown[] {
    const data = response as Record<string, unknown> | unknown[];

    if (Array.isArray(data)) return data;

    const embedded = (data as Record<string, unknown>)?.['_embedded'] as Record<string, unknown> | undefined;
    const embeddedList = embedded?.[embeddedKey];
    if (Array.isArray(embeddedList)) return embeddedList;

    const content = (data as Record<string, unknown>)?.['content'];
    if (Array.isArray(content)) return content;

    const items = (data as Record<string, unknown>)?.['items'];
    if (Array.isArray(items)) return items;

    const rawData = (data as Record<string, unknown>)?.['data'];
    if (Array.isArray(rawData)) return rawData;

    if (data && typeof data === 'object') return [data as unknown];

    return [];
  }

  private isFiniteNumber(value: unknown): boolean {
    return Number.isFinite(Number(value));
  }
}
