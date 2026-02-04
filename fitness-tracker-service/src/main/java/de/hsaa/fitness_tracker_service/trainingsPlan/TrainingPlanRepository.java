package de.hsaa.fitness_tracker_service.trainingsPlan;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {

	boolean existsByNameIgnoreCase(String name);

	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

	@EntityGraph(attributePaths = "sessions")
	Optional<TrainingPlan> findWithSessionsById(Long id);
}
