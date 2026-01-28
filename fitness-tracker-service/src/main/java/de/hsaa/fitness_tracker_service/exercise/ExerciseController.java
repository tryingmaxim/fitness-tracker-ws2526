package de.hsaa.fitness_tracker_service.exercise;

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

@RestController
@RequestMapping("/api/v1/exercises")
public class ExerciseController {

    private final ExerciseService service;

    public ExerciseController(ExerciseService service) {
        this.service = service;
    }

    // Listet nur aktive (nicht archivierte) Übungen
    @GetMapping
    public Page<Exercise> list(@PageableDefault(size = 20) Pageable pageable) {
        return service.list(pageable);
    }

    // Liefert eine aktive Übung anhand der ID
    @GetMapping("/{id}")
    public Exercise get(@PathVariable Long id) {
        return service.get(id);
    }

    // Legt eine neue Übung an
    @PostMapping
    public ResponseEntity<Exercise> create(@Valid @RequestBody Exercise body, UriComponentsBuilder uri) {
        var saved = service.create(body);
        var location = uri.path("/api/v1/exercises/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(saved);
    }

    // Ersetzt eine Übung vollständig
    @PutMapping("/{id}")
    public Exercise put(@PathVariable Long id, @Valid @RequestBody Exercise body) {
        return service.update(id, body);
    }

    // Aktualisiert Felder einer Übung (teilweise)
    @PatchMapping("/{id}")
    public Exercise patch(@PathVariable Long id, @RequestBody Exercise body) {
        return service.update(id, body);
    }

    // Archiviert eine Übung (Soft-Delete)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
