package de.hsaa.fitness_tracker_service.execution;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/training-sessions/{sessionId}/executions")
public class ExerciseExecutionController {

    private final ExerciseExecutionService service;

    public ExerciseExecutionController(ExerciseExecutionService service) {
        this.service = service;
    }

    public record CreateExecutionRequest(
        @NotNull Long exerciseId,
        @NotNull @Min(1) Integer orderIndex,
        @NotNull @Min(1) Integer plannedSets,
        @NotNull @Min(1) Integer plannedReps,
        @NotNull @Min(0) Double plannedWeightKg,
        String notes
    ) {}

    public record UpdateExecutionRequest(
        Long exerciseId,
        @Min(1) Integer orderIndex,
        @Min(1) Integer plannedSets,
        @Min(1) Integer plannedReps,
        @Min(0) Double plannedWeightKg,
        String notes
    ) {}

    @GetMapping
    public List<ExerciseExecution> list(@PathVariable Long sessionId) {
        return service.list(sessionId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExerciseExecution add(
        @PathVariable Long sessionId,
        @Valid @RequestBody CreateExecutionRequest body
    ) {
        return service.add(
            sessionId,
            body.exerciseId(),
            body.orderIndex(),
            body.plannedSets(),
            body.plannedReps(),
            body.plannedWeightKg(),
            body.notes()
        );
    }

    @PatchMapping("/{id}")
    public ExerciseExecution patch(
        @PathVariable Long sessionId,
        @PathVariable Long id,
        @RequestBody UpdateExecutionRequest body
    ) {
        return service.update(
            sessionId,
            id,
            body.exerciseId(),
            body.orderIndex(),
            body.plannedSets(),
            body.plannedReps(),
            body.plannedWeightKg(),
            body.notes()
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long sessionId, @PathVariable Long id) {
        service.delete(sessionId, id);
    }
}
