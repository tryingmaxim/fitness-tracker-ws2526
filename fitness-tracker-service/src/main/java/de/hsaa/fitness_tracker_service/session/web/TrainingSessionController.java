package de.hsaa.fitness_tracker_service.session.web;

import de.hsaa.fitness_tracker_service.session.domain.TrainingSession;
import de.hsaa.fitness_tracker_service.session.service.TrainingSessionService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/training-sessions")
public class TrainingSessionController {
	private final TrainingSessionService service;

	public TrainingSessionController(TrainingSessionService service) {
		this.service = service;
	}

	// Minimal Create-DTO, damit wir planId + name + date simpel schicken können
	public record CreateSessionRequest(@NotNull Long planId, @NotBlank String name, @NotNull LocalDate scheduledDate) {
	}

	public record UpdateSessionRequest(Long planId, String name, LocalDate scheduledDate) {
	}

	@GetMapping
	public Page<TrainingSession> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	@GetMapping("/{id}")
	public TrainingSession get(@PathVariable Long id) {
		return service.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TrainingSession create(@RequestBody CreateSessionRequest req) {
		return service.create(req.planId(), req.name(), req.scheduledDate());
	}

	@PutMapping("/{id}")
	public TrainingSession update(@PathVariable Long id, @RequestBody UpdateSessionRequest req) {
		return service.update(id, req.planId(), req.name(), req.scheduledDate());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}
