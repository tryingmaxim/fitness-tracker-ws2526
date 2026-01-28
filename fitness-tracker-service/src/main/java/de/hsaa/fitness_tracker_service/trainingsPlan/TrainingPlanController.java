package de.hsaa.fitness_tracker_service.trainingsPlan;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.validation.Valid;

//@RestController=HTTP-Schnittstelle für TrainingPlan
@RestController
//@RequestMapping=Basis-URL
@RequestMapping("/api/v1/training-plans")
public class TrainingPlanController {

	private final TrainingPlanService service;

	// Konstruktor-Injection
	public TrainingPlanController(TrainingPlanService service) {
		this.service = service;
	}

	// GET Liste 200 OK
	@GetMapping
	public Page<TrainingPlan> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	// GET Detail 200 OK/404
	@GetMapping("/{id}")
	public TrainingPlan get(@PathVariable Long id) {
		return service.get(id);
	}

	// POST Create 201 Created+Location-Header
	@PostMapping
	public ResponseEntity<TrainingPlan> create(@Valid @RequestBody TrainingPlan body, UriComponentsBuilder uri) {
		var saved = service.create(body);
		var location = uri.path("/api/v1/training-plans/{id}").buildAndExpand(saved.getId()).toUri();
		return ResponseEntity.created(location).body(saved);
	}

	// PUT vollständiges Update 200 OK/404/409
	@PutMapping("/{id}")
	public TrainingPlan put(@PathVariable Long id, @Valid @RequestBody TrainingPlan body) {
		return service.update(id, body);
	}

	// PATCH teilweise Update 200 OK/404/409
	@PatchMapping("/{id}")
	public TrainingPlan patch(@PathVariable Long id, @RequestBody TrainingPlan body) {
		return service.update(id, body);
	}

	// DELETE 204 No Content/404
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}
