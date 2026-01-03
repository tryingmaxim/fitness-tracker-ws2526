package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import de.hsaa.fitness_tracker_service.user.User;
import de.hsaa.fitness_tracker_service.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingExecutionServiceTest {

    @Mock TrainingExecutionRepository repo;
    @Mock TrainingSessionRepository sessionRepo;
    @Mock ExerciseRepository exerciseRepo;
    @Mock UserRepository userRepo;

    @InjectMocks TrainingExecutionService service;

    @AfterEach
    void cleanupSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthUser(String username) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(username);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // --- start() -------------------------------------------------------------

    @Test
    void shouldStartTrainingExecutionSetsOwnerAndCreatesExecutedExerciseAndSnapshots() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingPlan plan = new TrainingPlan();
        plan.setName("P");

        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);
        when(session.getName()).thenReturn("S");
        when(session.getPlan()).thenReturn(plan);

        Exercise ex = new Exercise();
        ex.setId(2L);
        ex.setName("Bench");
        ex.setCategory("Free");

        ExerciseExecution planned = new ExerciseExecution();
        planned.setExercise(ex);
        planned.setPlannedSets(3);
        planned.setPlannedReps(10);
        planned.setPlannedWeightKg(50.0);
        planned.setOrderIndex(1);

        when(session.getExerciseExecutions()).thenReturn(new LinkedHashSet<>(List.of(planned)));

        when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        TrainingExecution te = service.start(1L);

        assertEquals(TrainingExecution.Status.IN_PROGRESS, te.getStatus());
        assertNotNull(te.getStartedAt());
        assertNull(te.getCompletedAt());

        assertSame(current, te.getUser());

        assertEquals(1L, te.getSessionIdSnapshot());
        assertEquals("S", te.getSessionNameSnapshot());
        assertEquals("P", te.getPlanNameSnapshot());

        assertEquals(1, te.getExecutedExercises().size());
        ExecutedExercise ee = te.getExecutedExercises().iterator().next();

        assertSame(te, ee.getTrainingExecution());
        assertSame(ex, ee.getExercise());

        assertEquals("Bench", ee.getExerciseNameSnapshot());
        assertEquals("Free", ee.getExerciseCategorySnapshot());

        assertEquals(3, ee.getPlannedSets());
        assertEquals(10, ee.getPlannedReps());
        assertEquals(50.0, ee.getPlannedWeightKg());

        assertEquals(0, ee.getActualSets());
        assertEquals(0, ee.getActualReps());
        assertEquals(0.0, ee.getActualWeightKg());
        assertFalse(ee.isDone());
        assertNull(ee.getNotes());
    }

    @Test
    void shouldThrowUnauthorizedWhenStartWithoutAuthentication() {
        // keine Auth setzen, aber Session existiert -> Exception muss aus getCurrentUser kommen

        TrainingSession session = mock(TrainingSession.class);
        when(session.getExerciseExecutions()).thenReturn(
                new LinkedHashSet<>(List.of(mock(ExerciseExecution.class)))
        );

        when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));

        assertThrows(AccessDeniedException.class, () -> service.start(1L));
    }

    @Test
    void shouldThrowExceptionWhenStartSessionNotFound() {
        // Keine Auth nötig, weil vorher EntityNotFound fliegt
        when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.start(1L));
    }

    @Test
    void shouldThrowExceptionWhenSessionHasNoExercises() {
        // Keine Auth nötig, weil vorher IllegalArgument fliegt
        TrainingSession session = mock(TrainingSession.class);
        when(session.getExerciseExecutions()).thenReturn(new LinkedHashSet<>());

        when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));

        assertThrows(IllegalArgumentException.class, () -> service.start(1L));
    }

    // --- get() / owner -------------------------------------------------------

    @Test
    void shouldGetTrainingExecutionWhenOwnerMatches() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertSame(te, service.get(1L));
    }

    @Test
    void shouldThrowForbiddenWhenGetNotOwner() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        User other = mock(User.class);
        when(other.getId()).thenReturn(99L);

        TrainingExecution te = new TrainingExecution();
        te.setUser(other);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(AccessDeniedException.class, () -> service.get(1L));
    }

    @Test
    void shouldThrowExceptionWhenTrainingExecutionNotFound() {
        // Keine Auth nötig, weil vorher EntityNotFound fliegt
        when(repo.findWithExercisesById(1L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.get(1L));
    }

    // --- complete() / cancel() ----------------------------------------------

    @Test
    void shouldCompleteTrainingExecution() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setStartedAt(LocalDateTime.now());

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        TrainingExecution result = service.complete(1L);

        assertSame(te, result);
        assertEquals(TrainingExecution.Status.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
    }

    @Test
    void shouldThrowExceptionWhenCompletingAlreadyCompletedTraining() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.COMPLETED);
        te.setCompletedAt(LocalDateTime.now());

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class, () -> service.complete(1L));
    }

    @Test
    void shouldCancelTrainingExecutionWhenNotCompleted() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        service.cancel(1L);

        verify(repo).delete(te);
    }

    @Test
    void shouldThrowExceptionWhenCancelCompletedTraining() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.COMPLETED);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class, () -> service.cancel(1L));
        verify(repo, never()).delete(any());
    }

    // --- upsertExecutedExercise() -------------------------------------------

    @Test
    void shouldThrowExceptionWhenUpsertOnNotInProgress() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.COMPLETED);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class,
                () -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
    }

    @Test
    void shouldThrowExceptionWhenUpsertActualSetsInvalid() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class,
                () -> service.upsertExecutedExercise(1L, 2L, -1, 0, 0.0, false, null));
    }

    @Test
    void shouldThrowExceptionWhenUpsertActualRepsInvalid() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class,
                () -> service.upsertExecutedExercise(1L, 2L, 0, -1, 0.0, false, null));
    }

    @Test
    void shouldThrowExceptionWhenUpsertActualWeightInvalid() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class,
                () -> service.upsertExecutedExercise(1L, 2L, 0, 0, -0.1, false, null));
    }

    @Test
    void shouldThrowExceptionWhenExerciseNotFoundDuringUpsert() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        Exercise existing = new Exercise();
        existing.setId(2L);

        ExecutedExercise row = new ExecutedExercise();
        row.setExercise(existing);
        te.getExecutedExercises().add(row);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
    }

    @Test
    void shouldUpsertExecutedExerciseHappyPathTrimsNotesAndUpdatesSnapshotsWhenBlank() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        // echte Exercise => kein unnecessary stubbing
        Exercise existing = new Exercise();
        existing.setId(2L);

        ExecutedExercise row = new ExecutedExercise();
        row.setExercise(existing);
        row.setExerciseNameSnapshot("  ");
        row.setExerciseCategorySnapshot("   ");
        te.getExecutedExercises().add(row);

        Exercise exFromRepo = mock(Exercise.class);
        when(exFromRepo.getName()).thenReturn("Bench");
        when(exFromRepo.getCategory()).thenReturn("Free");

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(exFromRepo));

        TrainingExecution result = service.upsertExecutedExercise(1L, 2L, 5, 12, 42.5, true, "  ok  ");

        assertSame(te, result);
        assertEquals("Bench", row.getExerciseNameSnapshot());
        assertEquals("Free", row.getExerciseCategorySnapshot());
        assertEquals("ok", row.getNotes());
        assertEquals(5, row.getActualSets());
        assertEquals(12, row.getActualReps());
        assertEquals(42.5, row.getActualWeightKg());
        assertTrue(row.isDone());
    }

    @Test
    void shouldUpsertExecutedExerciseSetsNullNotesWhenNullProvided() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        Exercise existing = new Exercise();
        existing.setId(2L);

        ExecutedExercise row = new ExecutedExercise();
        row.setExercise(existing);
        row.setNotes("old");
        te.getExecutedExercises().add(row);

        Exercise exFromRepo = mock(Exercise.class);
        when(exFromRepo.getName()).thenReturn("Bench");
        when(exFromRepo.getCategory()).thenReturn("Free");

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(exFromRepo));

        TrainingExecution result = service.upsertExecutedExercise(1L, 2L, 1, 2, 3.0, false, null);

        assertSame(te, result);
        assertNull(row.getNotes());
    }

    @Test
    void shouldThrowExceptionWhenUpsertExerciseNotPartOfExecution() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(current.getId()).thenReturn(10L);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        TrainingExecution te = new TrainingExecution();
        te.setUser(current);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        Exercise different = new Exercise();
        different.setId(999L);

        ExecutedExercise row = new ExecutedExercise();
        row.setExercise(different);
        te.getExecutedExercises().add(row);

        when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));

        assertThrows(EntityNotFoundException.class,
                () -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
    }

    // --- list ----------------------------------------------------------------

    @Test
    void shouldListBySessionUsesRepositoryQueryWithUser() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        List<TrainingExecution> list = List.of(new TrainingExecution());
        when(repo.findWithExercisesBySessionOrSnapshotAndUser(1L, current)).thenReturn(list);

        List<TrainingExecution> result = service.listBySession(1L);

        assertSame(list, result);
        verify(repo).findWithExercisesBySessionOrSnapshotAndUser(1L, current);
    }

    @Test
    void shouldListAllUsesRepositoryQueryWithUser() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        List<TrainingExecution> list = List.of(new TrainingExecution());
        when(repo.findAllWithExercisesByUser(current)).thenReturn(list);

        List<TrainingExecution> result = service.listAll();

        assertSame(list, result);
        verify(repo).findAllWithExercisesByUser(current);
    }

    // --- streak --------------------------------------------------------------

    @Test
    void shouldCalculateCompletedStreakDaysReturnsZeroWhenNoCompleted() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        when(repo.findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                current, TrainingExecution.Status.COMPLETED
        )).thenReturn(List.of());

        assertEquals(0, service.calculateCompletedStreakDays());
    }

    @Test
    void shouldCalculateCompletedStreakDaysCountsConsecutiveUniqueDays() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        LocalDateTime now = LocalDateTime.now();

        TrainingExecution te1 = new TrainingExecution();
        te1.setStatus(TrainingExecution.Status.COMPLETED);
        te1.setCompletedAt(now.minusHours(1)); // today

        TrainingExecution te2 = new TrainingExecution();
        te2.setStatus(TrainingExecution.Status.COMPLETED);
        te2.setCompletedAt(now.minusDays(1).withHour(9)); // yesterday

        TrainingExecution te3 = new TrainingExecution();
        te3.setStatus(TrainingExecution.Status.COMPLETED);
        te3.setCompletedAt(now.minusDays(1).withHour(20)); // yesterday (duplicate day)

        TrainingExecution te4 = new TrainingExecution();
        te4.setStatus(TrainingExecution.Status.COMPLETED);
        te4.setCompletedAt(now.minusDays(3).withHour(8)); // gap

        when(repo.findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                current, TrainingExecution.Status.COMPLETED
        )).thenReturn(List.of(te1, te2, te3, te4));

        assertEquals(2, service.calculateCompletedStreakDays());
    }

    @Test
    void shouldCalculateCompletedStreakDaysReturnsZeroWhenLastTrainingOlderThanYesterday() {
        mockAuthUser("alice");

        User current = mock(User.class);
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(current));

        LocalDateTime now = LocalDateTime.now();

        TrainingExecution teOld = new TrainingExecution();
        teOld.setStatus(TrainingExecution.Status.COMPLETED);
        teOld.setCompletedAt(now.minusDays(2).withHour(10)); // older than yesterday

        when(repo.findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                current, TrainingExecution.Status.COMPLETED
        )).thenReturn(List.of(teOld));

        assertEquals(0, service.calculateCompletedStreakDays());
    }
}
