package de.hsaa.fitness_tracker_service.exercise.repo;

import de.hsaa.fitness_tracker_service.exercise.domain.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	boolean existsByNameIgnoreCase(String name);
}
