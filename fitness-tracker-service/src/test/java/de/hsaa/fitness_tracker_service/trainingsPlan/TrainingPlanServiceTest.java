package de.hsaa.fitness_tracker_service.trainingsPlan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class TrainingPlanServiceTest {

	@Mock
	TrainingPlanRepository repo;

	@InjectMocks
	TrainingPlanService service;

	@Test
	void shouldCreatePlanWhenNameUniqueTrimsFields() {
		TrainingPlan p = new TrainingPlan();
		p.setName(" Plan ");
		p.setDescription(" Desc ");

		when(repo.existsByNameIgnoreCase("Plan")).thenReturn(false);
		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		TrainingPlan result = service.create(p);

		assertSame(p, result);
		assertEquals("Plan", result.getName());
		assertEquals("Desc", result.getDescription());
		verify(repo).existsByNameIgnoreCase("Plan");
		verify(repo).save(p);
	}

	@Test
	void shouldThrowExceptionWhenPlanNameExistsOnCreate() {
		TrainingPlan p = new TrainingPlan();
		p.setName("Plan");
		p.setDescription("D");

		when(repo.existsByNameIgnoreCase("Plan")).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.create(p));
		verify(repo).existsByNameIgnoreCase("Plan");
		verify(repo, never()).save(any());
	}

	@Test
	void shouldListPlans() {
		Pageable pageable = Pageable.ofSize(10);
		Page<TrainingPlan> page = mock(Page.class);

		when(repo.findAll(pageable)).thenReturn(page);

		Page<TrainingPlan> result = service.list(pageable);

		assertSame(page, result);
		verify(repo).findAll(pageable);
	}

	@Test
	void shouldGetPlanWhenExists() {
		TrainingPlan p = new TrainingPlan();
		p.setId(1L);

		when(repo.findById(1L)).thenReturn(Optional.of(p));

		TrainingPlan result = service.get(1L);

		assertSame(p, result);
		assertEquals(1L, result.getId());
		verify(repo).findById(1L);
	}

	@Test
	void shouldThrowExceptionWhenPlanNotFound() {
		when(repo.findById(1L)).thenReturn(Optional.empty());

		assertThrows(EntityNotFoundException.class, () -> service.get(1L));
		verify(repo).findById(1L);
	}

	@Test
	void shouldUpdatePlanUpdatesOnlyNonNullFieldsAndTrims() {
		TrainingPlan current = new TrainingPlan();
		current.setId(1L);
		current.setName("Old");
		current.setDescription("OldDesc");

		TrainingPlan patch = new TrainingPlan();
		patch.setName(" New ");
		patch.setDescription(" NewDesc ");

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("New", 1L)).thenReturn(false);

		TrainingPlan result = service.update(1L, patch);

		assertSame(current, result);
		assertEquals("New", result.getName());
		assertEquals("NewDesc", result.getDescription());
		verify(repo).findById(1L);
		verify(repo).existsByNameIgnoreCaseAndIdNot("New", 1L);
	}

	@Test
	void shouldUpdatePlanWhenPatchHasNullFieldsDoesNotChangeExisting() {
		TrainingPlan current = new TrainingPlan();
		current.setId(1L);
		current.setName("Old");
		current.setDescription("OldDesc");

		TrainingPlan patch = new TrainingPlan();

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("Old", 1L)).thenReturn(false);

		TrainingPlan result = service.update(1L, patch);

		assertSame(current, result);
		assertEquals("Old", result.getName());
		assertEquals("OldDesc", result.getDescription());
		verify(repo).findById(1L);
		verify(repo).existsByNameIgnoreCaseAndIdNot("Old", 1L);
	}

	@Test
	void shouldThrowExceptionWhenUpdateNameExists() {
		TrainingPlan current = new TrainingPlan();
		current.setId(1L);
		current.setName("Old");
		current.setDescription("D");

		TrainingPlan patch = new TrainingPlan();
		patch.setName(" Dup ");

		when(repo.findById(1L)).thenReturn(Optional.of(current));
		when(repo.existsByNameIgnoreCaseAndIdNot("Dup", 1L)).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, patch));
		verify(repo).findById(1L);
		verify(repo).existsByNameIgnoreCaseAndIdNot("Dup", 1L);
	}

	@Test
	void shouldThrowExceptionWhenUpdateNotFound() {
		when(repo.findById(1L)).thenReturn(Optional.empty());
		assertThrows(EntityNotFoundException.class, () -> service.update(1L, new TrainingPlan()));
		verify(repo).findById(1L);
	}

	@Test
	void shouldDeletePlanWhenExists() {
		when(repo.existsById(1L)).thenReturn(true);

		service.delete(1L);

		verify(repo).existsById(1L);
		verify(repo).deleteById(1L);
	}

	@Test
	void shouldThrowExceptionWhenDeleteNotFound() {
		when(repo.existsById(1L)).thenReturn(false);

		assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
		verify(repo).existsById(1L);
		verify(repo, never()).deleteById(anyLong());
	}
}
