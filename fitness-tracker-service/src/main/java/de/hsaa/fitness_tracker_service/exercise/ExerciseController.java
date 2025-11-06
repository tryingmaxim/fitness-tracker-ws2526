package de.hsaa.fitness_tracker_service.exercise;

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

	// Liste (mit Pagination)
	@GetMapping
	public Page<Exercise> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	// GET by id
	@GetMapping("/{id}")
	public Exercise get(@PathVariable Long id) {
		return service.get(id);
	}

	// POST (ID wird automatisch generiert)
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Exercise create(@Valid @RequestBody Exercise body) {
		// Beschreibung optional; muscleGroups muss kommen
		return service.create(body);
	}
}
