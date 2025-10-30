package de.hsaa.fitness_tracker_service.exercise.web;

import de.hsaa.fitness_tracker_service.exercise.domain.Exercise;
import de.hsaa.fitness_tracker_service.exercise.service.ExerciseService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/exercises")
public class ExerciseController {
	private final ExerciseService service;

	public ExerciseController(ExerciseService service) {
		this.service = service;
	}

	@GetMapping
	public Page<Exercise> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	@GetMapping("/{id}")
	public Exercise get(@PathVariable Long id) {
		return service.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Exercise create(@Valid @RequestBody Exercise body) {
		return service.create(body);
	}

	@PutMapping("/{id}")
	public Exercise update(@PathVariable Long id, @Valid @RequestBody Exercise body) {
		return service.update(id, body);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}
