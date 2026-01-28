package de.hsaa.fitness_tracker_service.execution;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class ExerciseExecutionServiceTest {

    @Mock
    ExerciseExecutionRepository repo;
    @Mock
    TrainingSessionRepository sessionRepo;
    @Mock
    ExerciseRepository exerciseRepo;

    @InjectMocks
    ExerciseExecutionService service;

    @Test
    void shouldAddExerciseExecution() {
        TrainingSession session = mock(TrainingSession.class);
        Exercise exercise = mock(Exercise.class);

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(session));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(exercise));
        when(repo.existsBySessionIdAndOrderIndex(1L, 1)).thenReturn(false);
        when(repo.existsBySessionIdAndExerciseId(1L, 2L)).thenReturn(false);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        ExerciseExecution ee = service.add(1L, 2L, 1, 3, 10, 50.0, "  n  ");

        assertEquals(1, ee.getOrderIndex());
        assertEquals(3, ee.getPlannedSets());
        assertEquals(10, ee.getPlannedReps());
        assertEquals(50.0, ee.getPlannedWeightKg());
        assertEquals("n", ee.getNotes());
        verify(repo).save(any(ExerciseExecution.class));
    }

    @Test
    void shouldThrowExceptionWhenOrderIndexInvalid() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));

        assertThrows(IllegalArgumentException.class, () -> service.add(1L, 2L, 0, 1, 1, 0.0, null));
    }

    @Test
    void shouldThrowExceptionWhenPlannedSetsInvalid() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));

        assertThrows(IllegalArgumentException.class, () -> service.add(1L, 2L, 1, 0, 1, 0.0, null));
    }

    @Test
    void shouldThrowExceptionWhenPlannedRepsInvalid() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));

        assertThrows(IllegalArgumentException.class, () -> service.add(1L, 2L, 1, 1, 0, 0.0, null));
    }

    @Test
    void shouldThrowExceptionWhenPlannedWeightInvalid() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));

        assertThrows(IllegalArgumentException.class, () -> service.add(1L, 2L, 1, 1, 1, -1.0, null));
    }

    @Test
    void shouldThrowExceptionWhenDuplicateOrderIndex() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));
        when(repo.existsBySessionIdAndOrderIndex(1L, 1)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.add(1L, 2L, 1, 1, 1, 0.0, null));
    }

    @Test
    void shouldThrowExceptionWhenExerciseAlreadyInSession() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(exerciseRepo.findById(2L)).thenReturn(Optional.of(mock(Exercise.class)));
        when(repo.existsBySessionIdAndOrderIndex(1L, 1)).thenReturn(false);
        when(repo.existsBySessionIdAndExerciseId(1L, 2L)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.add(1L, 2L, 1, 1, 1, 0.0, null));
    }

    @Test
    void shouldThrowExceptionWhenListSessionNotFound() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.list(1L));
    }

    @Test
    void shouldListExecutionsWhenSessionExists() {
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mock(TrainingSession.class)));
        when(repo.findBySessionIdOrderByOrderIndexAsc(1L)).thenReturn(List.of());

        assertNotNull(service.list(1L));
        verify(repo).findBySessionIdOrderByOrderIndexAsc(1L);
    }

    @Test
    void shouldUpdateExecutionHappyPathUpdatesFields() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        Exercise oldExercise = mock(Exercise.class);
        when(oldExercise.getId()).thenReturn(2L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);
        current.setExercise(oldExercise);
        current.setOrderIndex(1);
        current.setPlannedSets(3);
        current.setPlannedReps(10);
        current.setPlannedWeightKg(50.0);
        current.setNotes("x");

        Exercise newExercise = mock(Exercise.class);

        when(repo.findById(10L)).thenReturn(Optional.of(current));
        when(exerciseRepo.findById(3L)).thenReturn(Optional.of(newExercise));
        when(repo.existsBySessionIdAndExerciseIdAndIdNot(1L, 3L, 10L)).thenReturn(false);
        when(repo.existsBySessionIdAndOrderIndexAndIdNot(1L, 2, 10L)).thenReturn(false);

        ExerciseExecution result = service.update(1L, 10L, 3L, 2, 4, 8, 60.0, "  note  ");

        assertSame(current, result);
        assertSame(newExercise, result.getExercise());
        assertEquals(2, result.getOrderIndex());
        assertEquals(4, result.getPlannedSets());
        assertEquals(8, result.getPlannedReps());
        assertEquals(60.0, result.getPlannedWeightKg());
        assertEquals("note", result.getNotes());
    }

    @Test
    void shouldThrowExceptionWhenUpdateExecutionNotInSession() {
        TrainingSession otherSession = mock(TrainingSession.class);
        when(otherSession.getId()).thenReturn(999L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(otherSession);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        assertThrows(EntityNotFoundException.class, () -> service.update(1L, 10L, null, null, null, null, null, null));
    }

    @Test
    void shouldDeleteExecutionWhenInSession() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        service.delete(1L, 10L);

        verify(repo).delete(current);
    }

    @Test
    void shouldUpdateOnlyNotesWhenNotesProvided() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);
        current.setOrderIndex(1);
        current.setPlannedSets(3);
        current.setPlannedReps(10);
        current.setPlannedWeightKg(50.0);
        current.setNotes("old");

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        ExerciseExecution result = service.update(1L, 10L, null, null, null, null, null, "  new  ");

        assertSame(current, result);
        assertEquals("new", result.getNotes());
    }

    @Test
    void shouldThrowExceptionWhenUpdateSetsInvalid() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, 10L, null, null, 0, null, null, null));
    }

    @Test
    void shouldThrowExceptionWhenUpdateRepsInvalid() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, 10L, null, null, null, 0, null, null));
    }

    @Test
    void shouldThrowExceptionWhenUpdateWeightInvalid() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, 10L, null, null, null, null, -1.0, null));
    }

    @Test
    void shouldThrowExceptionWhenUpdateOrderIndexInvalid() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));

        assertThrows(IllegalArgumentException.class, () -> service.update(1L, 10L, null, 0, null, null, null, null));
    }

    @Test
    void shouldThrowExceptionWhenUpdateOrderIndexDuplicate() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);

        when(repo.findById(10L)).thenReturn(Optional.of(current));
        when(repo.existsBySessionIdAndOrderIndexAndIdNot(1L, 2, 10L)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, 10L, null, 2, null, null, null, null));
    }

    @Test
    void shouldThrowExceptionWhenUpdateExerciseDuplicate() {
        TrainingSession session = mock(TrainingSession.class);
        when(session.getId()).thenReturn(1L);

        Exercise oldExercise = mock(Exercise.class);
        when(oldExercise.getId()).thenReturn(2L);

        ExerciseExecution current = new ExerciseExecution();
        current.setSession(session);
        current.setExercise(oldExercise);

        Exercise newExercise = mock(Exercise.class);

        when(repo.findById(10L)).thenReturn(Optional.of(current));
        when(exerciseRepo.findById(3L)).thenReturn(Optional.of(newExercise));
        when(repo.existsBySessionIdAndExerciseIdAndIdNot(1L, 3L, 10L)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, 10L, 3L, null, null, null, null, null));
    }
}
