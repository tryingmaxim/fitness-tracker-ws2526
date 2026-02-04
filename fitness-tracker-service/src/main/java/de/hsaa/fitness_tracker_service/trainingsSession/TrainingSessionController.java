package de.hsaa.fitness_tracker_service.trainingsSession;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecutionRepository;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecutionRepository;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay;
import de.hsaa.fitness_tracker_service.user.User;
import de.hsaa.fitness_tracker_service.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/training-sessions")
public class TrainingSessionController {

	private final TrainingSessionService service;
	private final TrainingExecutionRepository trainingExecutionRepo;
	private final ExerciseExecutionRepository exerciseExecutionRepo;
	private final UserRepository userRepo;

	public TrainingSessionController(TrainingSessionService service, TrainingExecutionRepository trainingExecutionRepo,
			ExerciseExecutionRepository exerciseExecutionRepo, UserRepository userRepo) {
		this.service = service;
		this.trainingExecutionRepo = trainingExecutionRepo;
		this.exerciseExecutionRepo = exerciseExecutionRepo;
		this.userRepo = userRepo;
	}

	public record CreateSessionRequest(@NotNull Long planId, @NotBlank String name,
			@NotNull List<@Min(1) @Max(30) Integer> days) {
	}

	public record UpdateSessionRequest(Long planId, String name, List<@Min(1) @Max(30) Integer> days) {
	}

	public record PlannedExerciseResponse(Long id, Long exerciseId, String exerciseName, String category,
			String muscleGroups, Integer orderIndex, Integer plannedSets, Integer plannedReps, Double plannedWeightKg,
			String notes) {
	}

	public record TrainingSessionResponse(Long id, String name, Long planId, String planName, List<Integer> days,
			long exerciseCount, long performedCount, List<PlannedExerciseResponse> exerciseExecutions) {
	}

	private static PlannedExerciseResponse toDto(ExerciseExecution e) {
		var ex = e.getExercise();
		return new PlannedExerciseResponse(e.getId(), ex != null ? ex.getId() : null, ex != null ? ex.getName() : null,
				ex != null ? ex.getCategory() : null, ex != null ? ex.getMuscleGroups() : null, e.getOrderIndex(),
				e.getPlannedSets(), e.getPlannedReps(), e.getPlannedWeightKg(), e.getNotes());
	}

	private static List<Integer> mapDays(TrainingSession s) {
		if (s.getDays() == null)
			return List.of();
		return s.getDays().stream().map(SessionDay::getDay).filter(Objects::nonNull).distinct().sorted().toList();
	}

	private TrainingSessionResponse toDto(TrainingSession s, boolean includeExercises, long exerciseCount,
			long performedCount) {
		List<PlannedExerciseResponse> execs = List.of();
		if (includeExercises && s.getExerciseExecutions() != null) {
			execs = s.getExerciseExecutions().stream().map(TrainingSessionController::toDto).toList();
		}

		return new TrainingSessionResponse(s.getId(), s.getName(), s.getPlan() != null ? s.getPlan().getId() : null,
				s.getPlan() != null ? s.getPlan().getName() : null, mapDays(s), exerciseCount, performedCount, execs);
	}

	@GetMapping
	public Page<TrainingSessionResponse> list(@PageableDefault(size = 20) Pageable pageable) {
		Page<TrainingSession> page = service.list(pageable);

		User currentUser = resolveCurrentUserOrNull();
		Map<Long, Long> performed = loadPerformedCounts(page.getContent(), currentUser);
		Map<Long, Long> exerciseCounts = loadExerciseCounts(page.getContent());

		return page.map(s -> toDto(s, false, exerciseCounts.getOrDefault(s.getId(), 0L),
				performed.getOrDefault(s.getId(), 0L)));
	}

	@GetMapping(params = "planId")
	public Page<TrainingSessionResponse> listByPlan(@RequestParam Long planId,
			@PageableDefault(size = 20) Pageable pageable) {
		Page<TrainingSession> page = service.listByPlan(planId, pageable);

		User currentUser = resolveCurrentUserOrNull();
		Map<Long, Long> performed = loadPerformedCounts(page.getContent(), currentUser);
		Map<Long, Long> exerciseCounts = loadExerciseCounts(page.getContent());

		return page.map(s -> toDto(s, false, exerciseCounts.getOrDefault(s.getId(), 0L),
				performed.getOrDefault(s.getId(), 0L)));
	}

	@GetMapping("/{id}")
	public TrainingSessionResponse get(@PathVariable Long id) {
		TrainingSession s = service.get(id);

		User currentUser = resolveCurrentUserOrNull();

		long performedCount = 0L;
		if (currentUser != null) {
			performedCount = trainingExecutionRepo.countBySessionOrSnapshotAndUser(id, currentUser);
		}

		long exerciseCount = s.getExerciseExecutions() != null ? s.getExerciseExecutions().size() : 0L;
		return toDto(s, true, exerciseCount, performedCount);
	}

	@PostMapping
	public ResponseEntity<TrainingSessionResponse> create(@Valid @RequestBody CreateSessionRequest req,
			UriComponentsBuilder uri) {
		var saved = service.create(req.planId(), req.name(), req.days());
		var location = uri.path("/api/v1/training-sessions/{id}").buildAndExpand(saved.getId()).toUri();
		return ResponseEntity.created(location).body(toDto(saved, true, 0L, 0L));
	}

	@PutMapping("/{id}")
	public TrainingSessionResponse put(@PathVariable Long id, @Valid @RequestBody UpdateSessionRequest req) {
		var updated = service.update(id, req.planId(), req.name(), req.days());

		User currentUser = resolveCurrentUserOrNull();
		long performedCount = 0L;
		if (currentUser != null) {
			performedCount = trainingExecutionRepo.countBySessionOrSnapshotAndUser(id, currentUser);
		}

		long exerciseCount = updated.getExerciseExecutions() != null ? updated.getExerciseExecutions().size() : 0L;

		return toDto(updated, true, exerciseCount, performedCount);
	}

	@PatchMapping("/{id}")
	public TrainingSessionResponse patch(@PathVariable Long id, @RequestBody UpdateSessionRequest req) {
		var updated = service.update(id, req.planId(), req.name(), req.days());

		User currentUser = resolveCurrentUserOrNull();
		long performedCount = 0L;
		if (currentUser != null) {
			performedCount = trainingExecutionRepo.countBySessionOrSnapshotAndUser(id, currentUser);
		}

		long exerciseCount = updated.getExerciseExecutions() != null ? updated.getExerciseExecutions().size() : 0L;

		return toDto(updated, true, exerciseCount, performedCount);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}

	private Map<Long, Long> loadPerformedCounts(List<TrainingSession> sessions, User currentUser) {
		List<Long> ids = sessions.stream().map(TrainingSession::getId).filter(Objects::nonNull).toList();
		if (ids.isEmpty())
			return Map.of();

		if (currentUser == null) {
			return Map.of();
		}

		Map<Long, Long> out = new HashMap<>();

		List<Object[]> rows1 = trainingExecutionRepo.countBySessionIdsAndUser(ids, currentUser);
		for (Object[] r : rows1) {
			Long id = (Long) r[0];
			Long cnt = (Long) r[1];
			out.merge(id, cnt, Long::sum);
		}

		List<Object[]> rows2 = trainingExecutionRepo.countBySessionIdSnapshotsAndUser(ids, currentUser);
		for (Object[] r : rows2) {
			Long id = (Long) r[0];
			Long cnt = (Long) r[1];
			out.merge(id, cnt, Long::sum);
		}

		return out;
	}

	private Map<Long, Long> loadExerciseCounts(List<TrainingSession> sessions) {
		List<Long> ids = sessions.stream().map(TrainingSession::getId).filter(Objects::nonNull).toList();
		if (ids.isEmpty())
			return Map.of();

		List<Object[]> rows = exerciseExecutionRepo.countBySessionIds(ids);
		return rows.stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));
	}

	private User resolveCurrentUserOrNull() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null)
			return null;
		if (!auth.isAuthenticated())
			return null;
		if (auth instanceof AnonymousAuthenticationToken)
			return null;

		String username = auth.getName();
		if (username == null || username.isBlank() || "anonymousUser".equalsIgnoreCase(username))
			return null;

		return userRepo.findByUsername(username).orElse(null);
	}
}
