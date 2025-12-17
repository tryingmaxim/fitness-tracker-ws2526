package de.hsaa.fitness_tracker_service.trainingExecution;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainingExecutionRepository extends JpaRepository<TrainingExecution, Long> {

    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    Optional<TrainingExecution> findWithExercisesById(Long id);

    long countBySessionId(Long sessionId);

    List<TrainingExecution> findBySessionId(Long sessionId);

    @Query("select te.session.id, count(te) from TrainingExecution te where te.session.id in :ids group by te.session.id")
    List<Object[]> countBySessionIds(@Param("ids") List<Long> ids);

    //NEU: nur COMPLETED, newest first (für Streak)
    @Query(" select te from TrainingExecution te where te.status = de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecution.Status.COMPLETED and te.completedAt is not null order by te.completedAt desc ")
    List<TrainingExecution> findRecentCompleted(Pageable pageable);
}

