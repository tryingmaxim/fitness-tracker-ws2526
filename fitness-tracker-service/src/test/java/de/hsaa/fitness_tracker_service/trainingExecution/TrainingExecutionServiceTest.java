package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
	void shouldStartTrainingExecution() {
		TrainingSession session = new TrainingSession();
		session.getExerciseExecutions().add(new ExerciseExecution());

		when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.of(session));
		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		TrainingExecution te = service.start(1L);

		assertEquals(TrainingExecution.Status.IN_PROGRESS, te.getStatus());
		assertNotNull(te.getStartedAt());
		assertNotNull(te.getExecutedExercises());
		assertEquals(1, te.getExecutedExercises().size());
	}

	@Test
	void shouldThrowExceptionWhenSessionHasNoExercises() {
		TrainingSession session = new TrainingSession();

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

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		TrainingExecution result = service.complete(1L);

		assertEquals(TrainingExecution.Status.COMPLETED, result.getStatus());
		assertNotNull(result.getCompletedAt());
	}

	@Test
	void shouldThrowExceptionWhenCompletingAlreadyCompletedTraining() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.COMPLETED);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class, () -> service.complete(1L));
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
	void shouldThrowExceptionWhenUpsertActualValuesInvalid() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));

		assertThrows(IllegalArgumentException.class,
				() -> service.upsertExecutedExercise(1L, 2L, -1, 0, 0.0, false, null));
	}

	@Test
	void shouldThrowExceptionWhenExerciseNotFoundDuringUpsert() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);
		ExecutedExercise exRow = new ExecutedExercise();
		Exercise ex = new Exercise();
		exRow.setExercise(ex);
		te.getExecutedExercises().add(exRow);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
		when(exerciseRepo.findById(2L)).thenReturn(Optional.empty());

		assertThrows(EntityNotFoundException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
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
	void shouldUpsertExecutedExerciseHappyPath() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		Exercise existing = mock(Exercise.class);
		when(existing.getId()).thenReturn(2L);

		ExecutedExercise row = new ExecutedExercise();
		row.setExercise(existing);
		te.getExecutedExercises().add(row);

		Exercise exFromRepo = mock(Exercise.class);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
		when(exerciseRepo.findById(2L)).thenReturn(Optional.of(exFromRepo));

		TrainingExecution result = service.upsertExecutedExercise(1L, 2L, 5, 12, 42.5, true, "  ok  ");

		assertSame(te, result);
		assertEquals(5, row.getActualSets());
		assertEquals(12, row.getActualReps());
		assertEquals(42.5, row.getActualWeightKg());
		assertTrue(row.isDone());
		assertEquals("ok", row.getNotes());
	}

	@Test
	void shouldThrowExceptionWhenUpsertExerciseNotPartOfExecution() {
		TrainingExecution te = new TrainingExecution();
		te.setStatus(TrainingExecution.Status.IN_PROGRESS);

		Exercise different = mock(Exercise.class);
		when(different.getId()).thenReturn(99L);

		ExecutedExercise row = new ExecutedExercise();
		row.setExercise(different);
		te.getExecutedExercises().add(row);

		Exercise exFromRepo = mock(Exercise.class);

		when(repo.findWithExercisesById(1L)).thenReturn(Optional.of(te));
		when(exerciseRepo.findById(2L)).thenReturn(Optional.of(exFromRepo));

		assertThrows(EntityNotFoundException.class,
				() -> service.upsertExecutedExercise(1L, 2L, 0, 0, 0.0, false, null));
	}

}
