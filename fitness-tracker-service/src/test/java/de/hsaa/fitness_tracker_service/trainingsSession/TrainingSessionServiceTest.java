package de.hsaa.fitness_tracker_service.trainingsSession;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecution;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecutionRepository;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlanRepository;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDayRepository;
import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class TrainingSessionServiceTest {

    @Mock
    TrainingSessionRepository repo;
    @Mock
    TrainingPlanRepository planRepo;
    @Mock
    TrainingExecutionRepository trainingExecutionRepo;
    @Mock
    SessionDayRepository sessionDayRepo;

    @InjectMocks
    TrainingSessionService service;

    @Test
    void shouldCreateSessionWithValidDaysDistinctSortedAndTrimmedName() {
        TrainingPlan plan = new TrainingPlan();

        when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
        when(sessionDayRepo.existsByPlanIdAndDay(1L, 2)).thenReturn(false);
        when(sessionDayRepo.existsByPlanIdAndDay(1L, 1)).thenReturn(false);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        TrainingSession result = service.create(1L, " Session ", java.util.Arrays.asList(2, 2, 1, null));

        assertSame(plan, result.getPlan());
        assertEquals("Session", result.getName());
        assertEquals(2, result.getDays().size());
        List<Integer> days = result.getDays().stream().map(SessionDay::getDay).sorted().toList();
        assertEquals(List.of(1, 2), days);
    }

    @Test
    void shouldThrowExceptionWhenCreatePlanNotFound() {
        when(planRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.create(1L, "A", List.of(1)));
    }

    @Test
    void shouldThrowExceptionWhenDaysEmpty() {
        when(planRepo.findById(1L)).thenReturn(Optional.of(new TrainingPlan()));
        assertThrows(IllegalArgumentException.class, () -> service.create(1L, "A", List.of()));
    }

    @Test
    void shouldThrowExceptionWhenDayOutOfRangeLow() {
        when(planRepo.findById(1L)).thenReturn(Optional.of(new TrainingPlan()));
        assertThrows(IllegalArgumentException.class, () -> service.create(1L, "A", List.of(0)));
    }

    @Test
    void shouldThrowExceptionWhenDayOutOfRangeHigh() {
        when(planRepo.findById(1L)).thenReturn(Optional.of(new TrainingPlan()));
        assertThrows(IllegalArgumentException.class, () -> service.create(1L, "A", List.of(31)));
    }

    @Test
    void shouldThrowExceptionWhenDayAlreadyUsed() {
        TrainingPlan plan = new TrainingPlan();

        when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
        when(sessionDayRepo.existsByPlanIdAndDay(1L, 1)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.create(1L, "A", List.of(1)));
    }

    @Test
    void shouldListSessions() {
        Pageable pageable = Pageable.ofSize(10);
        @SuppressWarnings("unchecked")
        Page<TrainingSession> page = mock(Page.class);

        when(repo.findAll(pageable)).thenReturn(page);

        assertSame(page, service.list(pageable));
        verify(repo).findAll(pageable);
    }

    @Test
    void shouldListSessionsByPlan() {
        TrainingPlan plan = new TrainingPlan();
        Pageable pageable = Pageable.ofSize(10);
        @SuppressWarnings("unchecked")
        Page<TrainingSession> page = mock(Page.class);

        when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
        when(repo.findAllByPlanId(1L, pageable)).thenReturn(page);

        assertSame(page, service.listByPlan(1L, pageable));
        verify(repo).findAllByPlanId(1L, pageable);
    }

    @Test
    void shouldThrowExceptionWhenListByPlanPlanNotFound() {
        when(planRepo.findById(123L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.listByPlan(123L, Pageable.ofSize(10)));
    }

    @Test
    void shouldGetSessionWhenExists() {
        TrainingSession s = new TrainingSession();

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(s));

        assertSame(s, service.get(1L));
        verify(repo).findWithExecutionsById(1L);
    }

    @Test
    void shouldThrowExceptionWhenSessionNotFound() {
        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.get(1L));
    }

    @Test
    void shouldUpdateSessionNameOnly() {
        TrainingSession current = new TrainingSession();
        current.setName("Old");
        TrainingPlan plan = new TrainingPlan();
        plan.setId(1L);
        current.setPlan(plan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));

        TrainingSession result = service.update(1L, null, "  New  ", null);

        assertSame(current, result);
        assertEquals("New", result.getName());
    }

    @Test
    void shouldUpdateSessionChangePlan() {
        TrainingPlan oldPlan = mock(TrainingPlan.class);
        when(oldPlan.getId()).thenReturn(1L);

        TrainingPlan newPlan = mock(TrainingPlan.class);

        TrainingSession current = new TrainingSession();
        current.setPlan(oldPlan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
        when(planRepo.findById(2L)).thenReturn(Optional.of(newPlan));

        TrainingSession result = service.update(1L, 2L, null, null);

        assertSame(newPlan, result.getPlan());
    }

    @Test
    void shouldThrowExceptionWhenUpdatePlanNotFound() {
        TrainingPlan oldPlan = mock(TrainingPlan.class);
        when(oldPlan.getId()).thenReturn(1L);

        TrainingSession current = new TrainingSession();
        current.setPlan(oldPlan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
        when(planRepo.findById(2L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.update(1L, 2L, null, null));
    }

    @Test
    void shouldUpdateSessionDaysReplaceDaysDistinct() {
        TrainingPlan plan = mock(TrainingPlan.class);
        when(plan.getId()).thenReturn(1L);

        TrainingSession current = new TrainingSession();
        current.setPlan(plan);
        current.getDays().add(new SessionDay());

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
        when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 1, 1L)).thenReturn(false);
        when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 2, 1L)).thenReturn(false);

        TrainingSession result = service.update(1L, null, null, java.util.Arrays.asList(1, 1, 2, null));

        assertSame(current, result);
        assertEquals(2, result.getDays().size());
        List<Integer> days = result.getDays().stream().map(SessionDay::getDay).sorted().toList();
        assertEquals(List.of(1, 2), days);
    }

    @Test
    void shouldThrowExceptionWhenUpdateDaysEmpty() {
        TrainingPlan plan = new TrainingPlan();
        plan.setId(1L);

        TrainingSession current = new TrainingSession();
        current.setPlan(plan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, null, null, List.of()));
    }

    @Test
    void shouldThrowExceptionWhenUpdateDayOutOfRange() {
        TrainingPlan plan = new TrainingPlan();
        plan.setId(1L);

        TrainingSession current = new TrainingSession();
        current.setPlan(plan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, null, null, List.of(31)));
    }

    @Test
    void shouldThrowExceptionWhenUpdateDaysConflict() {
        TrainingPlan plan = mock(TrainingPlan.class);
        when(plan.getId()).thenReturn(1L);

        TrainingSession current = new TrainingSession();
        current.setPlan(plan);

        when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
        when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 1, 1L)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, null, null, List.of(1)));
    }

    @Test
    void shouldDeleteSessionAndDetachExecutionsAndBackfillSnapshotsThenDelete() {
        TrainingPlan plan = new TrainingPlan();
        plan.setName("P");

        TrainingSession s = new TrainingSession();
        s.setName("S");
        s.setPlan(plan);

        TrainingExecution te1 = mock(TrainingExecution.class);
        TrainingExecution te2 = mock(TrainingExecution.class);

        when(repo.findById(1L)).thenReturn(Optional.of(s));
        when(trainingExecutionRepo.findBySessionId(1L)).thenReturn(List.of(te1, te2));

        service.delete(1L);

        verify(te1).setSession(null);
        verify(te2).setSession(null);
        verify(trainingExecutionRepo).saveAll(anyList());
        verify(repo).delete(s);
    }

    @Test
    void shouldDeleteSessionWhenNoExecutions() {
        TrainingPlan plan = new TrainingPlan();
        plan.setName("P");

        TrainingSession s = new TrainingSession();
        s.setName("S");
        s.setPlan(plan);

        when(repo.findById(1L)).thenReturn(Optional.of(s));
        when(trainingExecutionRepo.findBySessionId(1L)).thenReturn(List.of());

        service.delete(1L);

        verify(trainingExecutionRepo, never()).saveAll(anyList());
        verify(repo).delete(s);
    }

    @Test
    void shouldThrowExceptionWhenDeleteSessionNotFound() {
        when(repo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
        verify(repo, never()).delete(any());
    }

    @Test
    void shouldBackfillSnapshotsOnlyWhenNullOrBlank() {
        TrainingPlan plan = new TrainingPlan();
        plan.setName("P");

        TrainingSession s = new TrainingSession();
        s.setName("S");
        s.setPlan(plan);

        TrainingExecution te1 = mock(TrainingExecution.class);
        when(te1.getSessionIdSnapshot()).thenReturn(null);
        when(te1.getSessionNameSnapshot()).thenReturn("  ");
        when(te1.getPlanNameSnapshot()).thenReturn(null);

        when(repo.findById(1L)).thenReturn(Optional.of(s));
        when(trainingExecutionRepo.findBySessionId(1L)).thenReturn(List.of(te1));

        service.delete(1L);

        verify(te1).setSessionIdSnapshot(1L);
        verify(te1).setSessionNameSnapshot("S");
        verify(te1).setPlanNameSnapshot("P");
        verify(te1).setSession(null);
        verify(trainingExecutionRepo).saveAll(anyList());
        verify(repo).delete(s);
    }
}
