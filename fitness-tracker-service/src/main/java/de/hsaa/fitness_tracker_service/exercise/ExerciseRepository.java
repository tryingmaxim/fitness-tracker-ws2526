package de.hsaa.fitness_tracker_service.exercise;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	boolean existsByNameIgnoreCaseAndArchivedFalse(String name);

	boolean existsByNameIgnoreCaseAndIdNotAndArchivedFalse(String name, Long id);

	Page<Exercise> findByArchivedFalse(Pageable pageable);

	Page<Exercise> findByArchivedTrue(Pageable pageable);
}
