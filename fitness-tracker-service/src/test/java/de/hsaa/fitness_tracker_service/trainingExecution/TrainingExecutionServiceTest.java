package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingExecutionServiceTest {

	@Mock
	TrainingExecutionRepository repo;
	@Mock
	TrainingSessionRepository sessionRepo;
	@Mock
	ExerciseRepository exerciseRepo;

	@InjectMocks
	TrainingExecutionService service;

	@Test
	void shouldStartTrainingExecutionCreatesExecutedExerciseCopiesPlannedValuesAndSnapshots() {
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

		when(session.getExerciseExecutions()).thenReturn(new java.util.LinkedHashSet<>(java.util.List.of(planned)));

		when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));
		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		TrainingExecution te = service.start(1L);

		assertEquals(TrainingExecution.Status.IN_PROGRESS, te.getStatus());
		assertEquals(1L, te.getSessionIdSnapshot());
		assertEquals("S", te.getSessionNameSnapshot());
		assertEquals("P", te.getPlanNameSnapshot());
		assertEquals(1, te.getExecutedExercises().size());
	}

	@Test
	void shouldThrowExceptionWhenStartSessionNotFound() {
		when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.empty());
		assertThrows(EntityNotFoundException.class, () -> service.start(1L));
	}

	@Test
	void shouldThrowExceptionWhenSessionHasNoExercises() {
		TrainingSession session = mock(TrainingSession.class);
		when(session.getExerciseExecutions()).thenReturn(new java.util.LinkedHashSet<>());

		when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));

		assertThrows(IllegalArgumentException.class, () -> service.start(1L));
	}

	@Test
	void shouldGetTrainingExecution() {
		TrainingExecution te = new TrainingExecution();
		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
		assertSame(te, service.get(1L));
	}

	@Test
	void shouldThrowExceptionWhenTrainingExecutionNotFound() {
		when(repo.findWithExercisesById(1L)).thenReturn(Optional.empty());
		assertThrows(EntityNotFoundException.class, () -> service.get(1L));
	}

	@Test
	void shouldCompleteTrainingExecution() {
		TrainingExecution te = new TrainingExecution();
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
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.COMPLETED);
		te.setCompletedAt(LocalDateTime.now());

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class, () -> service.complete(1L));
	}

	@Test
	void shouldCancelTrainingExecutionWhenNotCompleted() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		service.cancel(1L);

		verify(repo).delete(te);
	}

	@Test
	void shouldThrowExceptionWhenCancelCompletedTraining() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.COMPLETED);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class, () -> service.cancel(1L));
		verify(repo, never()).delete(any());
	}

	@Test
	void shouldThrowExceptionWhenUpsertOnNotInProgress() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.COMPLETED);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
	}

	@Test
	void shouldThrowExceptionWhenUpsertActualSetsInvalid() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class,
				() -> service.upsertExecutedExercise(1L, 2L, -1, 0, 0.0, false, null));
	}

	@Test
	void shouldThrowExceptionWhenUpsertActualRepsInvalid() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, -1, 0.0, false, null));
	}

	@Test
	void shouldThrowExceptionWhenUpsertActualWeightInvalid() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, 0, -0.1, false, null));
	}

	@Test
	void shouldThrowExceptionWhenExerciseNotFoundDuringUpsert() throws Exception {
	    TrainingExecution te = new TrainingExecution();
	    te.setStatus(TrainingExecution.Status.IN_PROGRESS);

	    Exercise ex = new Exercise();
	    var f = Exercise.class.getDeclaredField("id");
	    f.setAccessible(true);
	    f.set(ex, 2L);

	    ExecutedExercise row = new ExecutedExercise();
	    row.setExercise(ex);
	    te.getExecutedExercises().add(row);

	    when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
	    when(exerciseRepo.findById(2L)).thenReturn(Optional.empty());

	    assertThrows(EntityNotFoundException.class,
	            () -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
	}


	@Test
	void shouldUpsertExecutedExerciseHappyPathTrimsNotesAndUpdatesSnapshotsWhenBlank() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		Exercise existing = mock(Exercise.class);
		when(existing.getId()).thenReturn(2L);

		ExecutedExercise row = new ExecutedExercise();
		row.setExercise(existing);
		row.setExerciseNameSnapshot("  ");
		row.setExerciseCategorySnapshot(null);
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
	}

	@Test
	void shouldUpsertExecutedExerciseHappyPathSetsNullNotesWhenNullProvided() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		Exercise existing = mock(Exercise.class);
		when(existing.getId()).thenReturn(2L);

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
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		Exercise different = mock(Exercise.class);

		ExecutedExercise row = new ExecutedExercise();
		row.setExercise(different);
		te.getExecutedExercises().add(row);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(EntityNotFoundException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
	}

	@Test
	void shouldListBySessionUsesRepositoryQuery() {
		List<TrainingExecution> list = List.of(new TrainingExecution());
		when(repo.findWithExercisesBySessionOrSnapshot(1L)).thenReturn(list);

		List<TrainingExecution> result = service.listBySession(1L);

		assertSame(list, result);
		verify(repo).findWithExercisesBySessionOrSnapshot(1L);
	}

	@Test
	void shouldListAllUsesRepositoryQuery() {
		List<TrainingExecution> list = List.of(new TrainingExecution());
		when(repo.findAllWithExercises()).thenReturn(list);

		List<TrainingExecution> result = service.listAll();

		assertSame(list, result);
		verify(repo).findAllWithExercises();
	}

	@Test
	void shouldCalculateCompletedStreakDaysReturnsZeroWhenNoCompleted() {
		when(repo.findByStatusOrderByCompletedAtDesc(TrainingExecution.Status.COMPLETED)).thenReturn(List.of());
		assertEquals(0, service.calculateCompletedStreakDays());
	}

	@Test
	void shouldCalculateCompletedStreakDaysCountsConsecutiveUniqueDays() {
		TrainingExecution te1 = new TrainingExecution();
		te1.setStatus(TrainingExecution.Status.COMPLETED);
		te1.setCompletedAt(LocalDateTime.of(2025, 12, 18, 10, 0));

		TrainingExecution te2 = new TrainingExecution();
		te2.setStatus(TrainingExecution.Status.COMPLETED);
		te2.setCompletedAt(LocalDateTime.of(2025, 12, 17, 9, 0));

		TrainingExecution te3 = new TrainingExecution();
		te3.setStatus(TrainingExecution.Status.COMPLETED);
		te3.setCompletedAt(LocalDateTime.of(2025, 12, 17, 20, 0));

		TrainingExecution te4 = new TrainingExecution();
		te4.setStatus(TrainingExecution.Status.COMPLETED);
		te4.setCompletedAt(LocalDateTime.of(2025, 12, 15, 8, 0));

		when(repo.findByStatusOrderByCompletedAtDesc(TrainingExecution.Status.COMPLETED))
				.thenReturn(List.of(te1, te2, te3, te4));

		assertEquals(2, service.calculateCompletedStreakDays());
	}

	@Test
	void shouldCalculateCompletedStreakDaysReturnsZeroWhenCompletedAtNull() {
		TrainingExecution te1 = new TrainingExecution();
		te1.setStatus(TrainingExecution.Status.COMPLETED);
		te1.setCompletedAt(null);

		when(repo.findByStatusOrderByCompletedAtDesc(TrainingExecution.Status.COMPLETED)).thenReturn(List.of(te1));

		assertEquals(0, service.calculateCompletedStreakDays());
	}
}
