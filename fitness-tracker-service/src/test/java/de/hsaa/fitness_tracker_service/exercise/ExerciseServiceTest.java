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
	void shouldListExercises() {
		Pageable pageable = Pageable.ofSize(10);
		Page<Exercise> page = mock(Page.class);

		when(repo.findByArchivedFalse(pageable)).thenReturn(page);

		Page<Exercise> result = service.list(pageable);

		assertSame(page, result);
		verify(repo).findByArchivedFalse(pageable);
	}

	@Test
	void shouldGetExerciseWhenExistsAndNotArchived() {
		Exercise e = new Exercise();
		e.setId(1L);
		e.setArchived(false);
		e.setName("Bench");

		when(repo.findById(1L)).thenReturn(Optional.of(e));

		Exercise result = service.get(1L);

		assertSame(e, result);
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
	void shouldCreateExerciseTrimsAndResetsFlags() {
		Exercise e = new Exercise();
		e.setId(123L);
		e.setArchived(true);
		e.setName(" Bench ");
		e.setCategory(" Free ");
		e.setMuscleGroups(" Chest ");
		e.setDescription("  desc  ");

		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		Exercise result = service.create(e);

		assertNull(result.getId());
		assertFalse(result.isArchived());
		assertEquals("Bench", result.getName());
		assertEquals("Free", result.getCategory());
		assertEquals("Chest", result.getMuscleGroups());
		assertEquals("desc", result.getDescription());
		verify(repo).save(result);
	}

	@Test
	void shouldUpdateExerciseUpdatesOnlyNonNullFieldsAndTrims() {
		Exercise current = new Exercise();
		current.setId(1L);
		current.setArchived(false);
		current.setName("Old");
		current.setCategory("C");
		current.setMuscleGroups("M");
		current.setDescription("D");

		Exercise patch = new Exercise();
		patch.setName(" New ");
		patch.setCategory(" Cat ");
		patch.setMuscleGroups("  Groups  ");
		patch.setDescription("  Desc  ");

		when(repo.findById(1L)).thenReturn(Optional.of(current));

		Exercise result = service.update(1L, patch);

		assertSame(current, result);
		assertEquals("New", result.getName());
		assertEquals("Cat", result.getCategory());
		assertEquals("Groups", result.getMuscleGroups());
		assertEquals("Desc", result.getDescription());
		verify(repo).findById(1L);
	}

	@Test
	void shouldUpdateExerciseWhenPatchHasNullFieldsDoesNotChangeExisting() {
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
		verify(repo).findById(1L);
	}

	@Test
	void shouldThrowExceptionWhenUpdateArchivedExercise() {
		Exercise current = new Exercise();
		current.setId(1L);
		current.setArchived(true);

		when(repo.findById(1L)).thenReturn(Optional.of(current));

		assertThrows(EntityNotFoundException.class, () -> service.update(1L, new Exercise()));
	}

	@Test
	void shouldThrowExceptionWhenUpdateNotFound() {
		when(repo.findById(1L)).thenReturn(Optional.empty());
		assertThrows(EntityNotFoundException.class, () -> service.update(1L, new Exercise()));
	}

	@Test
	void shouldArchiveExerciseWhenExists() {
		Exercise current = new Exercise();
		current.setId(1L);
		current.setArchived(false);

		when(repo.findById(1L)).thenReturn(Optional.of(current));

		service.delete(1L);

		assertTrue(current.isArchived());
		verify(repo).findById(1L);
		verifyNoMoreInteractions(repo);
	}

	@Test
	void shouldNotFailWhenDeleteAlreadyArchived() {
		Exercise current = new Exercise();
		current.setId(1L);
		current.setArchived(true);

		when(repo.findById(1L)).thenReturn(Optional.of(current));

		service.delete(1L);

		assertTrue(current.isArchived());
		verify(repo).findById(1L);
		verifyNoMoreInteractions(repo);
	}

	@Test
	void shouldThrowExceptionWhenDeleteNotFound() {
		when(repo.findById(1L)).thenReturn(Optional.empty());
		assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
	}
}
