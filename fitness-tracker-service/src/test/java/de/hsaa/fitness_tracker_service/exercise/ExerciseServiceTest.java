package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
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
	void shouldCreateExerciseWhenNameUnique() {
		Exercise e = new Exercise();
		e.setName(" Bench ");
		when(repo.existsByNameIgnoreCase("Bench")).thenReturn(false);
		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		Exercise result = service.create(e);

		assertEquals("Bench", result.getName());
		verify(repo).save(result);
	}

	@Test
	void shouldThrowExceptionWhenExerciseNameAlreadyExists() {
		Exercise e = new Exercise();
		e.setName("Bench");
		when(repo.existsByNameIgnoreCase("Bench")).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.create(e));
	}

	@Test
	void shouldGetExerciseWhenExists() {
		Exercise e = new Exercise();
		e.setId(1L);
		when(repo.findById(1L)).thenReturn(Optional.of(e));

		Exercise result = service.get(1L);

		assertEquals(1L, result.getId());
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
		current.setName("Old");

		Exercise patch = new Exercise();
		patch.setName("New");

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("New", 1L)).thenReturn(false);

		Exercise result = service.update(1L, patch);

		assertEquals("New", result.getName());
	}

	@Test
	void shouldThrowExceptionWhenUpdateNameExists() {
		Exercise current = new Exercise();
		current.setId(1L);

		Exercise patch = new Exercise();
		patch.setName("Dup");

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("Dup", 1L)).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, patch));
	}

	@Test
	void shouldDeleteExerciseWhenExists() {
		when(repo.existsById(1L)).thenReturn(true);

		service.delete(1L);

		verify(repo).deleteById(1L);
	}

	@Test
	void shouldThrowExceptionWhenDeleteNotFound() {
		when(repo.existsById(1L)).thenReturn(false);

		assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
	}

	@Test
	void shouldListExercises() {
		Pageable pageable = Pageable.ofSize(10);
		Page<Exercise> page = mock(Page.class);
		when(repo.findAll(pageable)).thenReturn(page);

		Page<Exercise> result = service.list(pageable);

		assertSame(page, result);
	}

	@Test
	void shouldUpdateExerciseWhenPatchHasNullFields() {
		Exercise current = new Exercise();
		current.setName("Old");
		current.setCategory("C");
		current.setMuscleGroups("M");
		current.setDescription("D");

		Exercise patch = new Exercise();

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("Old", 1L)).thenReturn(false);

		Exercise result = service.update(1L, patch);

		assertSame(current, result);
		assertEquals("Old", result.getName());
		assertEquals("C", result.getCategory());
		assertEquals("M", result.getMuscleGroups());
		assertNull(result.getDescription());
	}

}
