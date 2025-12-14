package de.hsaa.fitness_tracker_service.trainingsSession;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlanRepository;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecution;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecutionRepository;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDayRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingSessionServiceTest {

	@Mock
	TrainingSessionRepository repo;
	@Mock
	TrainingPlanRepository planRepo;
	@Mock
	TrainingExecutionRepository trainingExecutionRepo;
	@Mock
	SessionDayRepository sessionDayRepo;

	@InjectMocks
	TrainingSessionService service;

	@Test
	void shouldCreateSessionWithValidDays() {
		TrainingPlan plan = new TrainingPlan();

		when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
		when(sessionDayRepo.existsByPlanIdAndDay(1L, 1)).thenReturn(false);
		when(sessionDayRepo.existsByPlanIdAndDay(1L, 2)).thenReturn(false);
		when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

		TrainingSession result = service.create(1L, " Session ", List.of(1, 2));

		assertEquals("Session", result.getName());
		assertSame(plan, result.getPlan());
		assertEquals(2, result.getDays().size());
		assertTrue(result.getDays().stream().map(SessionDay::getDay).toList().containsAll(List.of(1, 2)));
	}

	@Test
	void shouldThrowExceptionWhenDaysEmpty() {
		when(planRepo.findById(1L)).thenReturn(Optional.of(new TrainingPlan()));

		assertThrows(IllegalArgumentException.class, () -> service.create(1L, "A", List.of()));
	}

	@Test
	void shouldThrowExceptionWhenDayOutOfRange() {
		when(planRepo.findById(1L)).thenReturn(Optional.of(new TrainingPlan()));

		assertThrows(IllegalArgumentException.class, () -> service.create(1L, "A", List.of(0)));
	}

	@Test
	void shouldThrowExceptionWhenDayAlreadyUsed() {
		TrainingPlan plan = new TrainingPlan();

		when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
		when(sessionDayRepo.existsByPlanIdAndDay(1L, 1)).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.create(1L, "A", List.of(1)));
	}

	@Test
	void shouldGetSessionWhenExists() {
		TrainingSession s = new TrainingSession();

		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(s));

		assertSame(s, service.get(1L));
	}

	@Test
	void shouldThrowExceptionWhenSessionNotFound() {
		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.empty());

		assertThrows(EntityNotFoundException.class, () -> service.get(1L));
	}

	@Test
	void shouldDeleteSessionAndDetachExecutions() {
		TrainingExecution te1 = mock(TrainingExecution.class);
		TrainingExecution te2 = mock(TrainingExecution.class);

		when(repo.existsById(1L)).thenReturn(true);
		when(trainingExecutionRepo.findBySessionId(1L)).thenReturn(List.of(te1, te2));

		service.delete(1L);

		verify(te1).setSession(null);
		verify(te2).setSession(null);
		verify(repo).deleteById(1L);
	}

	@Test
	void shouldThrowExceptionWhenDeleteSessionNotFound() {
		when(repo.existsById(1L)).thenReturn(false);

		assertThrows(EntityNotFoundException.class, () -> service.delete(1L));
		verify(repo, never()).deleteById(anyLong());
	}

	@Test
	void shouldListSessions() {
		Pageable pageable = Pageable.ofSize(10);
		@SuppressWarnings("unchecked")
		Page<TrainingSession> page = mock(Page.class);

		when(repo.findAll(pageable)).thenReturn(page);

		assertSame(page, service.list(pageable));
	}

	@Test
	void shouldListSessionsByPlan() {
		TrainingPlan plan = new TrainingPlan();
		Pageable pageable = Pageable.ofSize(10);
		@SuppressWarnings("unchecked")
		Page<TrainingSession> page = mock(Page.class);

		when(planRepo.findById(1L)).thenReturn(Optional.of(plan));
		when(repo.findAllByPlanId(1L, pageable)).thenReturn(page);

		assertSame(page, service.listByPlan(1L, pageable));
	}

	@Test
	void shouldUpdateSessionNameOnly() {
		TrainingSession current = new TrainingSession();
		current.setName("Old");

		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));

		TrainingSession result = service.update(1L, null, "  New  ", null);

		assertSame(current, result);
		assertEquals("New", result.getName());
	}

	@Test
	void shouldUpdateSessionChangePlan() {
		TrainingPlan oldPlan = mock(TrainingPlan.class);
		when(oldPlan.getId()).thenReturn(1L);

		TrainingPlan newPlan = mock(TrainingPlan.class);

		TrainingSession current = new TrainingSession();
		current.setPlan(oldPlan);

		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
		when(planRepo.findById(2L)).thenReturn(Optional.of(newPlan));

		TrainingSession result = service.update(1L, 2L, null, null);

		assertSame(newPlan, result.getPlan());
	}

	@Test
	void shouldUpdateSessionDaysReplaceDays() {
		TrainingPlan plan = mock(TrainingPlan.class);
		when(plan.getId()).thenReturn(1L);

		TrainingSession current = new TrainingSession();
		current.setPlan(plan);
		current.getDays().add(new de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay());

		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
		when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 1, 1L)).thenReturn(false);
		when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 2, 1L)).thenReturn(false);

		TrainingSession result = service.update(1L, null, null, java.util.Arrays.asList(1, 1, 2, null));

		assertSame(current, result);
		assertEquals(2, result.getDays().size());
		assertTrue(result.getDays().stream().allMatch(d -> d.getDay() == 1 || d.getDay() == 2));
	}

	@Test
	void shouldThrowExceptionWhenUpdateDaysConflict() {
		TrainingPlan plan = mock(TrainingPlan.class);
		when(plan.getId()).thenReturn(1L);

		TrainingSession current = new TrainingSession();
		current.setPlan(plan);

		when(repo.findWithExecutionsById(1L)).thenReturn(Optional.of(current));
		when(sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(1L, 1, 1L)).thenReturn(true);

		assertThrows(DataIntegrityViolationException.class, () -> service.update(1L, null, null, List.of(1)));
	}

	@Test
	void shouldThrowExceptionWhenListByPlanPlanNotFound() {
		when(planRepo.findById(123L)).thenReturn(Optional.empty());

		assertThrows(EntityNotFoundException.class, () -> service.listByPlan(123L, Pageable.ofSize(10)));
	}

}
