import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TrainingStart } from './training-start';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('TrainingStart', () => {
  let fixture: ComponentFixture<TrainingStart>;
  let component: TrainingStart;
  let httpMock: HttpTestingController;

  const paramMap$ = new BehaviorSubject(convertToParamMap({ sessionId: '42' }));

  const sessionResponse = {
    id: 42,
    name: 'Push Day',
    planId: 1,
    planName: 'Plan A',
    days: [1, 3],
    exerciseCount: 1,
    performedCount: 0,
    exerciseExecutions: [
      {
        id: 11,
        exerciseId: 100,
        exerciseName: 'Bench Press',
        category: 'Freihantel',
        orderIndex: 1,
        plannedSets: 3,
        plannedReps: 10,
        plannedWeightKg: 60,
        notes: '',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingStart, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingStart);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load session (ready state)', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/training-sessions/42'));
    req.flush(sessionResponse);

    expect(component).toBeTruthy();
    expect(component.state).toBe('ready');
    expect(component.session?.id).toBe(42);
    expect(component.totalCount).toBe(1);
    expect(component.actual[100]).toBeTruthy();
  });

  it('should show toast error when starting without exercises', fakeAsync(() => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/training-sessions/42'));
    req.flush({ ...sessionResponse, exerciseExecutions: [] });

    component.startTraining();

    expect(component.toast?.type).toBe('error');
    expect(component.toast?.text).toContain('noch keine Übungen');

    tick(3000);
    expect(component.toast).toBeNull();
  }));

  it('should validate sets input and set error on invalid value', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/training-sessions/42'));
    req.flush(sessionResponse);

    component.onRawInputChange(100, 'sets', 'abc');

    expect(component.errors[100]?.sets).toBeTruthy();
    expect(component.errors[100]?.sets).toContain('Nur ganze Zahlen');
  });

  it('should calculate percent based on done exercises', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/training-sessions/42'));
    req.flush(sessionResponse);

    expect(component.percent).toBe(0);

    component.onToggleDone(100, true);

    expect(component.doneCount).toBe(1);
    expect(component.totalCount).toBe(1);
    expect(component.percent).toBe(100);
  });

  it('should show toast error when saving without IN_PROGRESS execution', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/training-sessions/42'));
    req.flush(sessionResponse);

    component.saveProgress();

    expect(component.toast?.type).toBe('error');
    expect(component.toast?.text).toContain('Bitte starte zuerst');
  });
});
