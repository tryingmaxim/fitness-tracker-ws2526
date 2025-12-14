package de.hsaa.fitness_tracker_service.trainingsPlan;

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
class TrainingPlanServiceTest {

    @Mock
    TrainingPlanRepository repo;

    @InjectMocks
    TrainingPlanService service;

    @Test
    void shouldCreatePlanWhenNameUnique() {
        TrainingPlan p = new TrainingPlan();
        p.setName(" Plan ");

        when(repo.existsByNameIgnoreCase("Plan")).thenReturn(false);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        TrainingPlan result = service.create(p);

        assertEquals("Plan", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenPlanNameExists() {
        TrainingPlan p = new TrainingPlan();
        p.setName("Plan");

        when(repo.existsByNameIgnoreCase("Plan")).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.create(p));
    }

    @Test
    void shouldGetPlanWhenExists() {
        TrainingPlan p = new TrainingPlan();
        p.setId(1L);

        when(repo.findById(1L)).thenReturn(Optional.of(p));

        TrainingPlan result = service.get(1L);

        assertEquals(1L, result.getId());
    }

    @Test
    void shouldThrowExceptionWhenPlanNotFound() {
        when(repo.findById(1L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.get(1L));
    }

    @Test
    void shouldUpdatePlan() {
        TrainingPlan current = new TrainingPlan();
        current.setId(1L);
        current.setName("Old");

        TrainingPlan patch = new TrainingPlan();
        patch.setName("New");

        when(repo.findById(1L)).thenReturn(Optional.of(current));
        when(repo.existsByNameIgnoreCaseAndIdNot("New", 1L)).thenReturn(false);

        TrainingPlan result = service.update(1L, patch);

        assertEquals("New", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenUpdateNameExists() {
        TrainingPlan current = new TrainingPlan();
        current.setId(1L);

        TrainingPlan patch = new TrainingPlan();
        patch.setName("Dup");

        when(repo.findById(1L)).thenReturn(Optional.of(current));
        when(repo.existsByNameIgnoreCaseAndIdNot("Dup", 1L)).thenReturn(true);

        assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, patch));
    }

    @Test
    void shouldDeletePlanWhenExists() {
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
    void shouldListPlans() {
        Pageable pageable = Pageable.ofSize(10);
        Page<TrainingPlan> page = mock(Page.class);

        when(repo.findAll(pageable)).thenReturn(page);

        assertSame(page, service.list(pageable));
    }
}
