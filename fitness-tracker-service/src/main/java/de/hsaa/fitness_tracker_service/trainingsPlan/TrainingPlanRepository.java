package de.hsaa.fitness_tracker_service.trainingsPlan;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {

  boolean existsByNameIgnoreCase(String name);

  // NEU: Plan inkl. Sessions holen
  @EntityGraph(attributePaths = "sessions")
  Optional<TrainingPlan> findWithSessionsById(Long id);
}
