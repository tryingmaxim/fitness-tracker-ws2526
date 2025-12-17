package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock
    ExerciseRepository repo;

    @InjectMocks
    ExerciseService service;

    @Test
    void shouldCreateExercise() {
        Exercise e = new Exercise();
        e.setName(" Bench ");
        e.setCategory("Free");
        e.setMuscleGroups("Chest");

        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        Exercise result = service.create(e);

        assertNull(result.getId());
        assertEquals("Bench", result.getName());
        assertFalse(result.isArchived());
        verify(repo).save(result);
    }

    @Test
    void shouldGetExerciseWhenExistsAndNotArchived() {
        Exercise e = new Exercise();
        e.setId(1L);
        e.setArchived(false);

        when(repo.findById(1L)).thenReturn(Optional.of(e));

        Exercise result = service.get(1L);

        assertEquals(1L, result.getId());
    }

    @Test
    void shouldThrowExceptionWhenExerciseIsArchived() {
        Exercise e = new Exercise();
        e.setId(1L);
        e.setArchived(true);

        when(repo.findById(1L)).thenReturn(Optional.of(e));

        assertThrows(EntityNotFoundException.class, () -> service.get(1L));
    }

    @Test
    void shouldThrowExceptionWhenExerciseNotFound() {
        when(repo.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.get(99L));
    }

    @Test
    void shouldUpdateExercise() {
        Exercise current = new Exercise();
        current.setId(1L);
        current.setArchived(false);
        current.setName("Old");
        current.setCategory("C");
        current.setMuscleGroups("M");

        Exercise patch = new Exercise();
        patch.setName(" New ");

        when(repo.findById(1L)).thenReturn(Optional.of(current));

        Exercise result = service.update(1L, patch);

        assertEquals("New", result.getName());
        assertSame(current, result);
    }

    @Test
    void shouldThrowExceptionWhenUpdateArchivedExercise() {
        Exercise current = new Exercise();
        current.setId(1L);
        current.setArchived(true);

        Exercise patch = new Exercise();
        patch.setName("New");

        when(repo.findById(1L)).thenReturn(Optional.of(current));

        assertThrows(EntityNotFoundException.class, () -> service.update(1L, patch));
    }

    @Test
    void shouldArchiveExerciseWhenExists() {
        Exercise current = new Exercise();
        current.setId(1L);
        current.setArchived(false);

        when(repo.findById(1L)).thenReturn(Optional.of(current));

        service.delete(1L);

        assertTrue(current.isArchived());
        verify(repo, never()).deleteById(anyLong());
        verify(repo, never()).save(any());
    }

    @Test
    void shouldNotFailWhenDeleteAlreadyArchived() {
        Exercise current = new Exercise();
        current.setId(1L);
        current.setArchived(true);

        when(repo.findById(1L)).thenReturn(Optional.of(current));

        service.delete(1L);

        assertTrue(current.isArchived());
        verify(repo, never()).deleteById(anyLong());
        verify(repo, never()).save(any());
    }

    @Test
    void shouldThrowExceptionWhenDeleteNotFound() {
        when(repo.findById(1L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
    }

    @Test
    void shouldListExercises() {
        Pageable pageable = Pageable.ofSize(10);
        Page<Exercise> page = mock(Page.class);

        when(repo.findByArchivedFalse(pageable)).thenReturn(page);

        Page<Exercise> result = service.list(pageable);

        assertSame(page, result);
        verify(repo).findByArchivedFalse(pageable);
        verify(repo, never()).findAll(any(Pageable.class));
    }

    @Test
    void shouldUpdateExerciseWhenPatchHasNullFields() {
        Exercise current = new Exercise();
        current.setId(1L);
        current.setArchived(false);
        current.setName("Old");
        current.setCategory("C");
        current.setMuscleGroups("M");
        current.setDescription("D");

        Exercise patch = new Exercise();

        when(repo.findById(1L)).thenReturn(Optional.of(current));

        Exercise result = service.update(1L, patch);

        assertSame(current, result);
        assertEquals("Old", result.getName());
        assertEquals("C", result.getCategory());
        assertEquals("M", result.getMuscleGroups());
        assertEquals("D", result.getDescription());
    }
}
