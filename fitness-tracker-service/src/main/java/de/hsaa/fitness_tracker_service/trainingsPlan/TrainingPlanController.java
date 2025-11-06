package de.hsaa.fitness_tracker_service.trainingsPlan;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/training-plans")
public class TrainingPlanController {
	private final TrainingPlanService service;

	public TrainingPlanController(TrainingPlanService service) {
		this.service = service;
	}

	@GetMapping
	public Page<TrainingPlan> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	@GetMapping("/{id}")
	public TrainingPlan get(@PathVariable Long id) {
		return service.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TrainingPlan create(@Valid @RequestBody TrainingPlan body) {
		return service.create(body);
	}

	@PutMapping("/{id}")
	public TrainingPlan update(@PathVariable Long id, @Valid @RequestBody TrainingPlan body) {
		return service.update(id, body);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}
