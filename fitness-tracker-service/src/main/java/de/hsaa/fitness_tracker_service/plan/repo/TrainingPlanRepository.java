package de.hsaa.fitness_tracker_service.plan.repo;

import de.hsaa.fitness_tracker_service.plan.domain.TrainingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {
	boolean existsByNameIgnoreCase(String name);
}
