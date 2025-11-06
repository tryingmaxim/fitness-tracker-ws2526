package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

//@Service markiert die Klasse als Geschäftslogik-Schicht(Service Layer)
@Service
//@Transactional sorgt dafür,dass DB-Operationen sicher und atomar ausgeführt werden
@Transactional
public class ExerciseService {

	private final ExerciseRepository repo;

	// Konstruktor-Injection:Spring übergibt automatisch das Repository-Objekt
	public ExerciseService(ExerciseRepository repo) {
		this.repo = repo;
	}

	// Neue Übung anlegen(Create)
	public Exercise create(@Valid Exercise e) {
		normalize(e); // Textfelder bereinigen(Leerzeichen entfernen)
		// Wenn es schon eine Übung mit diesem Namen gibt→Fehler 409 CONFLICT
		if (repo.existsByNameIgnoreCase(e.getName())) {
			throw new DataIntegrityViolationException("exercise name already exists");
		}
		// Übung speichern und zurückgeben
		return repo.save(e);
	}

	// Alle Übungen abrufen(Read-All) mit Pagination und Sortierung
	@Transactional(readOnly = true)
	public Page<Exercise> list(Pageable pageable) {
		return repo.findAll(pageable);
	}

	// Einzelne Übung abrufen(Read-One)
	@Transactional(readOnly = true)
	public Exercise get(Long id) {
		return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));
	}

	// Übung aktualisieren(Update)
	public Exercise update(Long id, @Valid Exercise patch) {
		var current = get(id);// Vorhandene Übung aus DB holen

		// Nur die Felder überschreiben,die wirklich gesetzt sind
		if (patch.getName() != null)
			current.setName(patch.getName());
		if (patch.getCategory() != null)
			current.setCategory(patch.getCategory());
		if (patch.getMuscleGroups() != null)
			current.setMuscleGroups(patch.getMuscleGroups());
		current.setDescription(patch.getDescription());// optional

		normalize(current);// Leerzeichen entfernen
		// Wenn ein anderer Datensatz denselben Namen hat→Fehler 409 CONFLICT
		if (repo.existsByNameIgnoreCaseAndIdNot(current.getName(), id)) {
			throw new DataIntegrityViolationException("exercise name already exists");
		}
		return current;// Durch @Transactional wird automatisch gespeichert
	}

	// Übung löschen(Delete)
	public void delete(Long id) {
		// Wenn die ID nicht existiert→Fehler 404 NOT FOUND
		if (!repo.existsById(id)) {
			throw new EntityNotFoundException("exercise not found");
		}
		repo.deleteById(id);// Eintrag entfernen
	}

	// Hilfsmethode,um Texte vor dem Speichern zu bereinigen
	private static void normalize(Exercise e) {
		if (e.getName() != null)
			e.setName(e.getName().trim());
		if (e.getCategory() != null)
			e.setCategory(e.getCategory().trim());
		if (e.getMuscleGroups() != null)
			e.setMuscleGroups(e.getMuscleGroups().trim());
		if (e.getDescription() != null)
			e.setDescription(e.getDescription().trim());
	}
}
