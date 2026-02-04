import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Dashboard } from './dashboard';
import { environment } from '../../../../environment';

describe('Dashboard', () => {
  let component: Dashboard;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, Dashboard],
    });

    component = TestBed.createComponent(Dashboard).componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clamp todayDayOfMonth30 to 30', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-01-31T10:00:00.000Z'));

    const day = component.todayDayOfMonth30;

    expect(day).toBe(30);

    jasmine.clock().uninstall();
  });

  it('should return true when day matches todayDayOfMonth30', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-01-15T10:00:00.000Z'));

    const result = component.isTodayCalendarDay(15);

    expect(result).toBeTrue();

    jasmine.clock().uninstall();
  });

  it('should load streak and update stats on success', () => {
    component.ngOnInit();

    const reqSessions = httpMock.expectOne(`${environment.apiBaseUrl}/training-sessions`);
    reqSessions.flush({ trainingSessions: [] });

    const reqExercises = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    reqExercises.flush({ exercises: [] });

    const reqPlans = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    reqPlans.flush({ trainingPlans: [] });

    const reqStreak = httpMock.expectOne(`${environment.apiBaseUrl}/training-executions/stats/streak`);
    reqStreak.flush({ streakDays: 7 });

    expect(component.stats[2].value).toBe('7 Tage');
    expect(component.stats[2].sub).toBe('ohne Pause');
  });

  it('should set fallback streak values on error', () => {
    component.ngOnInit();

    const reqSessions = httpMock.expectOne(`${environment.apiBaseUrl}/training-sessions`);
    reqSessions.flush({ trainingSessions: [] });

    const reqExercises = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    reqExercises.flush({ exercises: [] });

    const reqPlans = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    reqPlans.flush({ trainingPlans: [] });

    const reqStreak = httpMock.expectOne(`${environment.apiBaseUrl}/training-executions/stats/streak`);
    reqStreak.error(new ProgressEvent('NetworkError'));

    expect(component.stats[2].value).toBe('0 Tage');
    expect(component.stats[2].sub).toBe('Streak nicht verfügbar (Backend)');
  });

  it('should build plan tabs and calendar days when plans and sessions are loaded', () => {
    component.ngOnInit();

    const reqSessions = httpMock.expectOne(`${environment.apiBaseUrl}/training-sessions`);
    reqSessions.flush({
      trainingSessions: [
        { id: 10, name: 'Session A', planId: 1, days: [1, 2] },
        { id: 11, name: 'Session B', plan: { id: 1, name: 'Plan 1' }, days: [2] },
      ],
    });

    const reqExercises = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    reqExercises.flush({ exercises: [] });

    const reqPlans = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    reqPlans.flush({
      trainingPlans: [{ id: 1, name: 'Plan 1', description: 'Desc' }],
    });

    const reqStreak = httpMock.expectOne(`${environment.apiBaseUrl}/training-executions/stats/streak`);
    reqStreak.flush({ streakDays: 0 });

    expect(component.planTabs.length).toBe(1);
    expect(component.selectedPlanId).toBe(1);
    expect(component.selectedPlanDays.length).toBe(30);

    const day1 = component.selectedPlanDays[0];
    const day2 = component.selectedPlanDays[1];

    expect(day1.sessions.length).toBe(1);
    expect(day1.sessions[0].name).toBe('Session A');

    expect(day2.sessions.length).toBe(2);
  });

  it('should show empty collections when backend responds with arrays directly', () => {
    component.ngOnInit();

    const reqSessions = httpMock.expectOne(`${environment.apiBaseUrl}/training-sessions`);
    reqSessions.flush([]);

    const reqExercises = httpMock.expectOne(`${environment.apiBaseUrl}/exercises`);
    reqExercises.flush([]);

    const reqPlans = httpMock.expectOne(`${environment.apiBaseUrl}/training-plans`);
    reqPlans.flush([]);

    const reqStreak = httpMock.expectOne(`${environment.apiBaseUrl}/training-executions/stats/streak`);
    reqStreak.flush({ streakDays: 0 });

    expect(component.quickSessions.length).toBe(0);
    expect(component.lastExercises.length).toBe(0);
    expect(component.plansDashboard.length).toBe(0);
  });
});
