package de.hsaa.fitness_tracker_service.trainingsSession;

import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/api/v1/training-sessions")
public class TrainingSessionController {

    private final TrainingSessionService service;

    public TrainingSessionController(TrainingSessionService service) {
        this.service = service;
    }

    public record CreateSessionRequest(
        @NotNull Long planId,
        @NotBlank String name,
        @NotNull @Min(1) @Max(30) Integer orderInPlan
    ) {}

    public record UpdateSessionRequest(
        Long planId,
        String name,
        @Min(1) @Max(30) Integer orderInPlan
    ) {}

    public record ExecutionResponse(Long id, Long exerciseId, Integer orderIndex, String notes) {}

    public record TrainingSessionResponse(
        Long id,
        Long planId,
        String name,
        Integer orderInPlan,
        List<ExecutionResponse> exerciseExecutions
    ) {}

    private static TrainingSessionResponse toDto(TrainingSession s, boolean includeExecutions) {
        List<ExecutionResponse> execs = List.of();
        if (includeExecutions && s.getExerciseExecutions() != null) {
            execs = s.getExerciseExecutions().stream().map(TrainingSessionController::toDto).toList();
        }
        return new TrainingSessionResponse(
            s.getId(),
            s.getPlan() != null ? s.getPlan().getId() : null,
            s.getName(),
            s.getOrderInPlan(),
            execs
        );
    }

    private static ExecutionResponse toDto(ExerciseExecution e) {
        return new ExecutionResponse(
            e.getId(),
            e.getExercise() != null ? e.getExercise().getId() : null,
            e.getOrderIndex(),
            e.getNotes()
        );
    }

    @GetMapping
    public Page<TrainingSessionResponse> list(@PageableDefault(size = 20) Pageable pageable) {
        return service.list(pageable).map(s -> toDto(s, false));
    }

    @GetMapping(params = "planId")
    public Page<TrainingSessionResponse> listByPlan(
        @RequestParam Long planId,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return service.listByPlan(planId, pageable).map(s -> toDto(s, false));
    }

    @GetMapping("/{id}")
    public TrainingSessionResponse get(@PathVariable Long id) {
        return toDto(service.get(id), true);
    }

    @PostMapping
    public ResponseEntity<TrainingSessionResponse> create(
        @Valid @RequestBody CreateSessionRequest req,
        UriComponentsBuilder uri
    ) {
        var saved = service.create(req.planId(), req.name(), req.orderInPlan());
        var location = uri.path("/api/v1/training-sessions/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(toDto(saved, true));
    }

    @PutMapping("/{id}")
    public TrainingSessionResponse put(@PathVariable Long id, @Valid @RequestBody UpdateSessionRequest req) {
        var updated = service.update(id, req.planId(), req.name(), req.orderInPlan());
        return toDto(updated, true);
    }

    @PatchMapping("/{id}")
    public TrainingSessionResponse patch(@PathVariable Long id, @RequestBody UpdateSessionRequest req) {
        var updated = service.update(id, req.planId(), req.name(), req.orderInPlan());
        return toDto(updated, true);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
