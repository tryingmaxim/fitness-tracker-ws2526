package de.hsaa.fitness_tracker_service.trainingExecution;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/training-executions")
public class TrainingExecutionController {

    private final TrainingExecutionService service;

    public TrainingExecutionController(TrainingExecutionService service) {
        this.service = service;
    }

    public record StartTrainingRequest(@NotNull Long sessionId) {}

    public record UpdateExecutedExerciseRequest(
        @NotNull Long exerciseId,
        @NotNull @Min(0) Integer actualSets,
        @NotNull @Min(0) Integer actualReps,
        @NotNull @Min(0) Double actualWeightKg,
        boolean done,
        String notes
    ) {}

    public record ExecutedExerciseResponse(
        Long id,
        Long exerciseId,
        Integer actualSets,
        Integer actualReps,
        Double actualWeightKg,
        boolean done,
        String notes
    ) {}

    public record TrainingExecutionResponse(
        Long id,
        Long sessionId,
        String status,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        List<ExecutedExerciseResponse> executedExercises
    ) {}

    private static TrainingExecutionResponse toDto(TrainingExecution te) {
        List<ExecutedExerciseResponse> execs = List.of();
        if (te.getExecutedExercises() != null) {
            execs = te.getExecutedExercises().stream().map(TrainingExecutionController::toDto).toList();
        }
        return new TrainingExecutionResponse(
            te.getId(),
            te.getSession() != null ? te.getSession().getId() : null,
            te.getStatus() != null ? te.getStatus().name() : null,
            te.getStartedAt(),
            te.getCompletedAt(),
            execs
        );
    }

    private static ExecutedExerciseResponse toDto(ExecutedExercise e) {
        return new ExecutedExerciseResponse(
            e.getId(),
            e.getExercise() != null ? e.getExercise().getId() : null,
            e.getActualSets(),
            e.getActualReps(),
            e.getActualWeightKg(),
            e.isDone(),
            e.getNotes()
        );
    }

    @PostMapping
    public ResponseEntity<TrainingExecutionResponse> start(
        @Valid @RequestBody StartTrainingRequest body,
        UriComponentsBuilder uri
    ) {
        var saved = service.start(body.sessionId());
        var location = uri.path("/api/v1/training-executions/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(toDto(saved));
    }

    @GetMapping("/{id}")
    public TrainingExecutionResponse get(@PathVariable Long id) {
        return toDto(service.get(id));
    }

    @GetMapping("/{id}/exercises")
    public List<ExecutedExerciseResponse> listExercises(@PathVariable Long id) {
        return service.get(id).getExecutedExercises().stream().map(TrainingExecutionController::toDto).toList();
    }

    @PutMapping("/{id}/exercises")
    public TrainingExecutionResponse upsertExercise(
        @PathVariable Long id,
        @Valid @RequestBody UpdateExecutedExerciseRequest body
    ) {
        return toDto(service.upsertExecutedExercise(
            id,
            body.exerciseId(),
            body.actualSets(),
            body.actualReps(),
            body.actualWeightKg(),
            body.done(),
            body.notes()
        ));
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
