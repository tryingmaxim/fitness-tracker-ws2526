package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrainingExecutionServiceTest {

    private TrainingExecutionRepository repo;
    private TrainingSessionRepository sessionRepo;
    private ExerciseRepository exerciseRepo;
    private TrainingExecutionService service;

    @BeforeEach
    void setup() {
        repo = mock(TrainingExecutionRepository.class);
        sessionRepo = mock(TrainingSessionRepository.class);
        exerciseRepo = mock(ExerciseRepository.class);
        service = new TrainingExecutionService(repo, sessionRepo, exerciseRepo);
    }

    @Test
    void startShouldCreateExecutionWithExecutedExercises() {
        long sessionId = 1L;

        Exercise ex1 = new Exercise();
        ex1.setId(10L);
        ex1.setName("Bench");

        ExerciseExecution planned1 = new ExerciseExecution();
        planned1.setExercise(ex1);

        TrainingSession session = new TrainingSession();
        session.setId(sessionId);
        session.setExerciseExecutions(List.of(planned1));

        when(sessionRepo.findWithExecutionsById(sessionId)).thenReturn(Optional.of(session));
        when(repo.save(any(TrainingExecution.class))).thenAnswer(inv -> inv.getArgument(0));

        TrainingExecution created = service.start(sessionId);

        assertNotNull(created);
        assertEquals(TrainingExecution.Status.IN_PROGRESS, created.getStatus());
        assertNotNull(created.getStartedAt());
        assertNull(created.getCompletedAt());
        assertEquals(session, created.getSession());
        assertNotNull(created.getExecutedExercises());
        assertEquals(1, created.getExecutedExercises().size());

        ExecutedExercise ee = created.getExecutedExercises().get(0);
        assertEquals(ex1, ee.getExercise());
        assertEquals(0, ee.getActualSets());
        assertEquals(0, ee.getActualReps());
        assertEquals(0.0, ee.getActualWeightKg());
        assertFalse(ee.isDone());
        assertNull(ee.getNotes());
        assertEquals(created, ee.getTrainingExecution());

        ArgumentCaptor<TrainingExecution> captor = ArgumentCaptor.forClass(TrainingExecution.class);
        verify(repo).save(captor.capture());
        assertEquals(TrainingExecution.Status.IN_PROGRESS, captor.getValue().getStatus());
    }

    @Test
    void startShouldThrowWhenSessionHasNoExercises() {
        long sessionId = 1L;

        TrainingSession session = new TrainingSession();
        session.setId(sessionId);
        session.setExerciseExecutions(List.of());

        when(sessionRepo.findWithExecutionsById(sessionId)).thenReturn(Optional.of(session));

        assertThrows(IllegalArgumentException.class, () -> service.start(sessionId));
        verify(repo, never()).save(any());
    }

    @Test
    void startShouldThrowWhenSessionNotFound() {
        when(sessionRepo.findWithExecutionsById(1L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.start(1L));
        verify(repo, never()).save(any());
    }

    @Test
    void getShouldReturnExecution() {
        TrainingExecution te = new TrainingExecution();
        te.setId(5L);

        when(repo.findWithExercisesById(5L)).thenReturn(Optional.of(te));

        TrainingExecution found = service.get(5L);
        assertEquals(5L, found.getId());
    }

    @Test
    void getShouldThrowWhenNotFound() {
        when(repo.findWithExercisesById(5L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.get(5L));
    }

    @Test
    void upsertExecutedExerciseShouldUpdateValuesWhenInProgress() {
        long executionId = 7L;
        long exerciseId = 11L;

        Exercise ex = new Exercise();
        ex.setId(exerciseId);

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setStartedAt(LocalDateTime.now());

        ExecutedExercise ee = new ExecutedExercise();
        ee.setTrainingExecution(te);
        ee.setExercise(ex);
        ee.setActualSets(0);
        ee.setActualReps(0);
        ee.setActualWeightKg(0.0);
        ee.setDone(false);

        te.setExecutedExercises(List.of(ee));

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(exerciseId)).thenReturn(Optional.of(ex));

        TrainingExecution updated = service.upsertExecutedExercise(
            executionId, exerciseId, 3, 10, 50.0, true, "ok"
        );

        ExecutedExercise updatedEe = updated.getExecutedExercises().get(0);
        assertEquals(3, updatedEe.getActualSets());
        assertEquals(10, updatedEe.getActualReps());
        assertEquals(50.0, updatedEe.getActualWeightKg());
        assertTrue(updatedEe.isDone());
        assertEquals("ok", updatedEe.getNotes());
    }

    @Test
    void upsertExecutedExerciseShouldThrowWhenCompleted() {
        long executionId = 7L;
        long exerciseId = 11L;

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.COMPLETED);

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class, () ->
            service.upsertExecutedExercise(executionId, exerciseId, 1, 1, 1.0, false, null)
        );
    }

    @Test
    void upsertExecutedExerciseShouldThrowWhenExerciseNotInExecution() {
        long executionId = 7L;
        long exerciseId = 11L;

        Exercise ex = new Exercise();
        ex.setId(exerciseId);

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setExecutedExercises(List.of());

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));
        when(exerciseRepo.findById(exerciseId)).thenReturn(Optional.of(ex));

        assertThrows(EntityNotFoundException.class, () ->
            service.upsertExecutedExercise(executionId, exerciseId, 1, 1, 1.0, false, null)
        );
    }

    @Test
    void completeShouldSetCompletedAtAndStatus() {
        long executionId = 9L;

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setStartedAt(LocalDateTime.now());

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));

        TrainingExecution completed = service.complete(executionId);

        assertEquals(TrainingExecution.Status.COMPLETED, completed.getStatus());
        assertNotNull(completed.getCompletedAt());
    }

    @Test
    void completeShouldThrowWhenAlreadyCompleted() {
        long executionId = 9L;

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.COMPLETED);

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class, () -> service.complete(executionId));
    }

    @Test
    void cancelShouldDeleteWhenInProgress() {
        long executionId = 3L;

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));

        service.cancel(executionId);

        verify(repo).delete(te);
    }

    @Test
    void cancelShouldThrowWhenCompleted() {
        long executionId = 3L;

        TrainingExecution te = new TrainingExecution();
        te.setId(executionId);
        te.setStatus(TrainingExecution.Status.COMPLETED);

        when(repo.findWithExercisesById(executionId)).thenReturn(Optional.of(te));

        assertThrows(IllegalArgumentException.class, () -> service.cancel(executionId));
        verify(repo, never()).delete(any());
    }
}
