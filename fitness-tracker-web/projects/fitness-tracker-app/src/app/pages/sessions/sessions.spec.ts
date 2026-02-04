import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Sessions } from './sessions';
import { SessionsApiService } from './sessions-api.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { Exercise, TrainingPlan, TrainingSession } from './sessions.models';

describe('Sessions (private page)', () => {
  let component: Sessions;
  let apiService: jasmine.SpyObj<SessionsApiService>;
  let authSessionService: jasmine.SpyObj<AuthSessionService>;

  const plansMock: TrainingPlan[] = [{ id: 1, name: 'Plan A' }];
  const sessionsMock: TrainingSession[] = [{ id: 10, name: 'Session A', planId: 1, days: [1, 3] }];
  const exercisesMock: Exercise[] = [{ id: 7, name: 'Bench Press' }];

  beforeEach(() => {
    apiService = jasmine.createSpyObj<SessionsApiService>('SessionsApiService', [
      'getPlans',
      'getSessions',
      'getExercises',
      'getExecutionsForSessions',
      'getExecutions',
      'createSession',
      'createExecution',
      'updateSession',
      'updateExecution',
      'deleteSession',
      'deleteExecution',
    ]);

    authSessionService = jasmine.createSpyObj<AuthSessionService>('AuthSessionService', ['isLoggedIn']);

    apiService.getPlans.and.returnValue(of(plansMock));
    apiService.getSessions.and.returnValue(of(sessionsMock));
    apiService.getExercises.and.returnValue(of(exercisesMock));
    apiService.getExecutionsForSessions.and.returnValue(of([[]]));

    TestBed.configureTestingModule({
      providers: [
        Sessions,
        { provide: SessionsApiService, useValue: apiService },
        { provide: AuthSessionService, useValue: authSessionService },
      ],
    });

    component = TestBed.inject(Sessions);
  });

  it('should format days sorted and joined', () => {
    // Arrange
    const input = [3, 1, 2];

    // Act
    const result = component.formatDays(input);

    // Assert
    expect(result).toBe('1, 2, 3');
  });

  it('should format empty days as dash', () => {
    // Arrange
    const input: number[] = [];

    // Act
    const result = component.formatDays(input);

    // Assert
    expect(result).toBe('-');
  });

  it('should filter sessions by search term', () => {
    // Arrange
    component.sessions = [
      { id: 1, name: 'Push Day', planId: 1, days: [1] },
      { id: 2, name: 'Pull Day', planId: 1, days: [2] },
    ];
    component.sessionSearch = 'pull';

    // Act
    const filtered = component.filteredSessionsForOverview;

    // Assert
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Pull Day');
  });

  it('should block creating when not logged in', () => {
    // Arrange
    authSessionService.isLoggedIn.and.returnValue(false);

    // Act
    component.add();

    // Assert
    expect(component.errorMsg).toContain('Bitte anmelden');
    expect(apiService.createSession).not.toHaveBeenCalled();
  });

  it('should validate create form and not call API when required fields are missing', () => {
    // Arrange
    authSessionService.isLoggedIn.and.returnValue(true);
    component.form = { planId: null, name: '', days: [] };

    // Act
    component.add();

    // Assert
    expect(component.errorMsg).toContain('Bitte Plan, Name');
    expect(apiService.createSession).not.toHaveBeenCalled();
  });

  it('should create session when form is valid', () => {
    // Arrange
    authSessionService.isLoggedIn.and.returnValue(true);

    component.plans = plansMock;
    component.sessions = sessionsMock;

    component.form = { planId: 1, name: 'New Session', days: [5] };
    apiService.createSession.and.returnValue(of({ id: 99 }));
    apiService.createExecution.and.returnValue(of({}));
    apiService.getSessions.and.returnValue(
      of([...sessionsMock, { id: 99, name: 'New Session', planId: 1, days: [5] }])
    );
    apiService.getExecutionsForSessions.and.returnValue(of([[], []]));

    // Act
    component.add();

    // Assert
    expect(apiService.createSession).toHaveBeenCalled();
  });

  it('should handle unauthorized errors on create session', () => {
    // Arrange
    authSessionService.isLoggedIn.and.returnValue(true);
    component.form = { planId: 1, name: 'New Session', days: [5] };

    apiService.createSession.and.returnValue(throwError(() => ({ status: 401 })));

    // Act
    component.add();

    // Assert
    expect(component.errorMsg).toContain('Nicht berechtigt');
  });

  it('should include full payload when shifting order indices', () => {
    // Arrange
    authSessionService.isLoggedIn.and.returnValue(true);

    (component as any)['detailOriginal'] = { id: 10, name: 'Session A', planId: 1, daysKey: '1,3' };
    component.detailForm = { id: 10, name: 'Session A', planId: 1, days: [1, 3] };

    (component as any)['detailOriginalExecutions'] = [
      { executionId: 1, exerciseId: 7, orderIndex: 1, plannedSets: 3, plannedReps: 10, plannedWeightKg: 0, notes: null },
    ];

    component.detailExecutions = [
      { executionId: 1, exerciseId: 7, orderIndex: 2, plannedSets: 3, plannedReps: 10, plannedWeightKg: 0, notes: null },
    ];

    apiService.updateExecution.and.returnValue(of({}));
    apiService.updateSession.and.returnValue(of(void 0));
    apiService.getSessions.and.returnValue(of([]));
    apiService.getExecutionsForSessions.and.returnValue(of([]));

    // Act
    component.updateSelectedSession();

    // Assert
    expect(apiService.updateExecution).toHaveBeenCalled();

    const args = apiService.updateExecution.calls.mostRecent().args;
    const payload = args[2] as any;

    expect(payload.exerciseId).toBe(7);
    expect(payload.plannedSets).toBe(3);
    expect(payload.plannedReps).toBe(10);
    expect(payload.plannedWeightKg).toBe(0);
    expect(payload.orderIndex).toBeGreaterThan(1000);
  });
});
