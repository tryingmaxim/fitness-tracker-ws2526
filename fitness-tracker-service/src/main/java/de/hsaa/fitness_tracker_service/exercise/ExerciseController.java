package de.hsaa.fitness_tracker_service.exercise;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

//@RestController bedeutet,dass diese Klasse HTTP-Anfragen entgegennimmt
@RestController
//@RequestMapping legt die Basis-URL für alle Endpunkte fest
@RequestMapping("/api/v1/exercises")
public class ExerciseController {

	private final ExerciseService service;

	// Konstruktor:Spring übergibt automatisch das Service-Objekt
	public ExerciseController(ExerciseService service) {
		this.service = service;
	}

	// GET /api/v1/exercises Liste aller Übungen mit Pagination
	@GetMapping
	public Page<Exercise> list(@PageableDefault(size = 20) Pageable pageable) {
		return service.list(pageable);
	}

	// GET /api/v1/exercises/{id} Einzelne Übung anhand ihrer ID abrufen
	@GetMapping("/{id}")
	public Exercise get(@PathVariable Long id) {
		return service.get(id);
	}

	// POST /api/v1/exercises Neue Übung erstellen
	@PostMapping
	public ResponseEntity<Exercise> create(@Valid @RequestBody Exercise body, UriComponentsBuilder uri) {
		var saved = service.create(body);// Service aufrufen→speichern
		// URI der neuen Ressource erzeugen(z.B./api/v1/exercises/5)
		var location = uri.path("/api/v1/exercises/{id}").buildAndExpand(saved.getId()).toUri();
		// HTTP 201 Created zurückgeben + Location-Header
		return ResponseEntity.created(location).body(saved);
	}

	// PUT /api/v1/exercises/{id} Bestehende Übung komplett überschreiben
	@PutMapping("/{id}")
	public Exercise put(@PathVariable Long id, @Valid @RequestBody Exercise body) {
		return service.update(id, body);
	}

	// PATCH /api/v1/exercises/{id} Nur teilweise Felder aktualisieren
	@PatchMapping("/{id}")
	public Exercise patch(@PathVariable Long id, @RequestBody Exercise body) {
		return service.update(id, body);
	}

	// DELETE /api/v1/exercises/{id} Übung löschen
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT) // Kein Inhalt,aber erfolgreiche Löschung
	public void delete(@PathVariable Long id) {
		service.delete(id);
	}
}
