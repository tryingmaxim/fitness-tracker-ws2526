package de.hsaa.fitness_tracker_service.execution;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExerciseExecutionRepository extends JpaRepository<ExerciseExecution, Long> {

    List<ExerciseExecution> findBySessionIdOrderByOrderIndexAsc(Long sessionId);

    boolean existsBySessionIdAndOrderIndex(Long sessionId, Integer orderIndex);

    boolean existsBySessionIdAndExerciseId(Long sessionId, Long exerciseId);

    boolean existsBySessionIdAndOrderIndexAndIdNot(Long sessionId, Integer orderIndex, Long id);

    boolean existsBySessionIdAndExerciseIdAndIdNot(Long sessionId, Long exerciseId, Long id);

    long countBySessionId(Long sessionId);

    @Query("select ee.session.id, count(ee) from ExerciseExecution ee where ee.session.id in :ids group by ee.session.id")
    List<Object[]> countBySessionIds(@Param("ids") List<Long> ids);
}
