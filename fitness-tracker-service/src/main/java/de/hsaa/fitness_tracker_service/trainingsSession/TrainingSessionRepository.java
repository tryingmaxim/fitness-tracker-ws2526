package de.hsaa.fitness_tracker_service.session.repo;

import de.hsaa.fitness_tracker_service.session.domain.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
	boolean existsByPlanIdAndNameIgnoreCaseAndScheduledDate(Long planId, String name, LocalDate date);
}
