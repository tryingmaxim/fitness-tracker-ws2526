package de.hsaa.fitness_tracker_service.execution;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

//@RestController=verschachtelte Ressource unter einer Session
@RestController
@RequestMapping("/api/v1/training-sessions/{sessionId}/executions")
public class ExerciseExecutionController {

	private final ExerciseExecutionService service;

	// Konstruktor-Injection
	public ExerciseExecutionController(ExerciseExecutionService service) {
		this.service = service;
	}

	// DTOs für Requests
	public record CreateExecutionRequest(@NotNull Long exerciseId, @NotNull @Min(1) Integer orderIndex, String notes) {
	}

	public record UpdateExecutionRequest(Long exerciseId, @Min(1) Integer orderIndex, String notes) {
	}

	// GET Liste aller Ausführungen einer Session→200
	@GetMapping
	public List<ExerciseExecution> list(@PathVariable Long sessionId) {
		return service.list(sessionId);
	}

	// POST neue Ausführung→201
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ExerciseExecution add(@PathVariable Long sessionId, @RequestBody CreateExecutionRequest body) {
		return service.add(sessionId, body.exerciseId(), body.orderIndex(), body.notes());
	}

	// PATCH bestehende Ausführung→200
	@PatchMapping("/{id}")
	public ExerciseExecution patch(@PathVariable Long sessionId, @PathVariable Long id,
			@RequestBody UpdateExecutionRequest body) {
		return service.update(sessionId, id, body.exerciseId(), body.orderIndex(), body.notes());
	}

	// DELETE Ausführung→204
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long sessionId, @PathVariable Long id) {
		service.delete(sessionId, id);
	}
}
