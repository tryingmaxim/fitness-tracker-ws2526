package de.hsaa.fitness_tracker_service.exercise;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

// Repository für Exercise inkl. Validierungs-Checks und Soft-Delete (archived)
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    // Prüft, ob eine aktive Übung mit dem Namen existiert (Create-Validierung)
    boolean existsByNameIgnoreCaseAndArchivedFalse(String name);

    // Prüft, ob eine andere aktive Übung denselben Namen hat (Update-Validierung)
    boolean existsByNameIgnoreCaseAndIdNotAndArchivedFalse(String name, Long id);

    // Listet nur aktive Übungen (UI soll archivierte standardmäßig ausblenden)
    Page<Exercise> findByArchivedFalse(Pageable pageable);

    // Optional: falls später "Archivierte anzeigen" 
    Page<Exercise> findByArchivedTrue(Pageable pageable);
}
