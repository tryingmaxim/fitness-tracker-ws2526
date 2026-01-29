import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingProgress } from './training-progress';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthSessionService } from '../../services/auth-session.service';

describe('TrainingProgress', () => {
  let component: TrainingProgress;
  let fixture: ComponentFixture<TrainingProgress>;

  const authSessionServiceMock = {
    isLoggedIn: () => true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingProgress, HttpClientTestingModule],
      providers: [
        { provide: AuthSessionService, useValue: authSessionServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set isLoggedIn on init', () => {
    expect(component.isLoggedIn).toBeTrue();
  });

  it('should expose reconstructed exercises for deleted sessions', () => {
    const sessionId = 42;

    (component as any).detailCache.set(sessionId, {
      id: sessionId,
      name: 'Gelöschte Session',
      planId: null,
      planName: '-',
      days: [],
      exerciseCount: 1,
      performedCount: 1,
      exerciseExecutions: [
        {
          id: 1,
          exerciseId: 10,
          exerciseName: 'Squat',
          category: 'Legs',
          orderIndex: 1,
          plannedSets: 3,
          plannedReps: 8,
          plannedWeightKg: 100,
        },
      ],
    });

    const detail = component.getDetail(sessionId);

    expect(detail).toBeTruthy();
    expect(detail?.exerciseExecutions.length).toBe(1);
    expect(detail?.exerciseExecutions[0].exerciseName).toBe('Squat');
  });
});
