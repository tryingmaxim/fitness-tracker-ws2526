package de.hsaa.fitness_tracker_service.exercise;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	boolean existsByNameIgnoreCase(String name);
}
