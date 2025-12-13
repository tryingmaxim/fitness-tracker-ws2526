package de.hsaa.fitness_tracker_service.trainingsSession;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    boolean existsByPlanIdAndOrderInPlan(Long planId, Integer orderInPlan);

    boolean existsByPlanIdAndOrderInPlanAndIdNot(Long planId, Integer orderInPlan, Long id);

    long countByPlanId(Long planId);

    @EntityGraph(attributePaths = { "plan" })
    Page<TrainingSession> findAll(Pageable pageable);

    @EntityGraph(attributePaths = { "plan" })
    Page<TrainingSession> findAllByPlanId(Long planId, Pageable pageable);

    @EntityGraph(attributePaths = { "exerciseExecutions", "exerciseExecutions.exercise", "plan" })
    Optional<TrainingSession> findWithExecutionsById(Long id);
}
