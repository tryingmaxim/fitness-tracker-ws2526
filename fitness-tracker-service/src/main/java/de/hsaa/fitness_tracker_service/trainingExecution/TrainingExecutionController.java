package de.hsaa.fitness_tracker_service.trainingExecution;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/training-executions")
public class TrainingExecutionController {

	private final TrainingExecutionService service;

	public TrainingExecutionController(TrainingExecutionService service) {
		this.service = service;
	}

	public record StartTrainingRequest(@NotNull Long sessionId) {
	}

	public record UpdateExecutedExerciseRequest(@NotNull Long exerciseId, @NotNull @Min(0) Integer actualSets,
			@NotNull @Min(0) Integer actualReps, @NotNull @Min(0) Double actualWeightKg, boolean done, String notes) {
	}

	public record ExecutedExerciseResponse(Long id, Long exerciseId, String exerciseName, String exerciseCategory,
			Integer plannedSets, Integer plannedReps, Double plannedWeightKg, Integer actualSets, Integer actualReps,
			Double actualWeightKg, boolean done, String notes) {
	}

	public record TrainingExecutionResponse(Long id, Long sessionId, String sessionName, String planName, String status,
			LocalDateTime startedAt, LocalDateTime completedAt, List<ExecutedExerciseResponse> executedExercises) {
	}

	public record StreakResponse(int streakDays, LocalDate lastTrainingDay) {
	}

	private static TrainingExecutionResponse toDto(TrainingExecution te) {
		List<ExecutedExerciseResponse> execs = List.of();
		if (te.getExecutedExercises() != null) {
			execs = te.getExecutedExercises().stream().map(TrainingExecutionController::toDto).toList();
		}

		Long sessionId = te.getSession() != null ? te.getSession().getId() : te.getSessionIdSnapshot();
		String sessionName = te.getSession() != null ? te.getSession().getName() : te.getSessionNameSnapshot();
		String planName = te.getSession() != null && te.getSession().getPlan() != null
				? te.getSession().getPlan().getName()
				: te.getPlanNameSnapshot();

		return new TrainingExecutionResponse(te.getId(), sessionId, sessionName, planName,
				te.getStatus() != null ? te.getStatus().name() : null, te.getStartedAt(), te.getCompletedAt(), execs);
	}

	private static ExecutedExerciseResponse toDto(ExecutedExercise e) {
		Long exerciseId = e.getExercise() != null ? e.getExercise().getId() : null;

		String exerciseName = e.getExercise() != null ? e.getExercise().getName() : e.getExerciseNameSnapshot();

		String exerciseCategory = e.getExercise() != null ? e.getExercise().getCategory()
				: e.getExerciseCategorySnapshot();

		return new ExecutedExerciseResponse(e.getId(), exerciseId, exerciseName, exerciseCategory, e.getPlannedSets(),
				e.getPlannedReps(), e.getPlannedWeightKg(), e.getActualSets(), e.getActualReps(), e.getActualWeightKg(),
				e.isDone(), e.getNotes());
	}

	@PostMapping
	public ResponseEntity<TrainingExecutionResponse> start(@Valid @RequestBody StartTrainingRequest body,
			UriComponentsBuilder uri) {
		var saved = service.start(body.sessionId());
		var location = uri.path("/api/v1/training-executions/{id}").buildAndExpand(saved.getId()).toUri();
		return ResponseEntity.created(location).body(toDto(saved));
	}

	@GetMapping("/{id}")
	public TrainingExecutionResponse get(@PathVariable Long id) {
		return toDto(service.get(id));
	}

	@PutMapping("/{id}/exercises")
	public TrainingExecutionResponse upsertExercise(@PathVariable Long id,
			@Valid @RequestBody UpdateExecutedExerciseRequest body) {
		return toDto(service.upsertExecutedExercise(id, body.exerciseId(), body.actualSets(), body.actualReps(),
				body.actualWeightKg(), body.done(), body.notes()));
	}

	@GetMapping(params = "sessionId")
	public List<TrainingExecutionResponse> listBySession(@RequestParam Long sessionId) {
		return service.listBySession(sessionId).stream().map(TrainingExecutionController::toDto).toList();
	}

	@GetMapping
	public List<TrainingExecutionResponse> listAll() {
		return service.listAll().stream().map(TrainingExecutionController::toDto).toList();
	}

	@GetMapping("/stats/streak")
	public StreakResponse streak() {
		return new StreakResponse(service.calculateCompletedStreakDays(), null);
	}

	@PostMapping("/{id}/complete")
	public TrainingExecutionResponse complete(@PathVariable Long id) {
		return toDto(service.complete(id));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancel(@PathVariable Long id) {
		service.cancel(id);
	}
}
