package de.hsaa.fitness_tracker_service.trainingsSession;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    long countByPlanId(Long planId);

    @EntityGraph(attributePaths = { "plan", "days" })
    Page<TrainingSession> findAll(Pageable pageable);

    @EntityGraph(attributePaths = { "plan", "days" })
    Page<TrainingSession> findAllByPlanId(Long planId, Pageable pageable);

    @EntityGraph(attributePaths = {
        "plan",
        "days",
        "exerciseExecutions",
        "exerciseExecutions.exercise"
    })
    Optional<TrainingSession> findWithExecutionsById(Long id);
}
