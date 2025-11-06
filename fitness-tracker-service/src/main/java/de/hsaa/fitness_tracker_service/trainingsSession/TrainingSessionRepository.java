package de.hsaa.fitness_tracker_service.trainingsSession;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

//@Repository = DB-Zugriffe
public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

	boolean existsByPlanIdAndNameIgnoreCaseAndScheduledDate(Long planId, String name, LocalDate date);

	boolean existsByPlanIdAndNameIgnoreCaseAndScheduledDateAndIdNot(Long planId, String name, LocalDate date, Long id);

	Page<TrainingSession> findAllByPlanId(Long planId, Pageable pageable);

	// Detail: lade Executions + deren Exercises mit
	@EntityGraph(attributePaths = { "exerciseExecutions", "exerciseExecutions.exercise", "plan" })
	Optional<TrainingSession> findWithExecutionsById(Long id);
}
