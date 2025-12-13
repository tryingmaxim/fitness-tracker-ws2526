package de.hsaa.fitness_tracker_service.execution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExerciseExecutionRepository extends JpaRepository<ExerciseExecution, Long> {

    List<ExerciseExecution> findBySessionIdOrderByOrderIndexAsc(Long sessionId);

    boolean existsBySessionIdAndOrderIndex(Long sessionId, Integer orderIndex);

    boolean existsBySessionIdAndExerciseId(Long sessionId, Long exerciseId);

    boolean existsBySessionIdAndOrderIndexAndIdNot(Long sessionId, Integer orderIndex, Long id);

    boolean existsBySessionIdAndExerciseIdAndIdNot(Long sessionId, Long exerciseId, Long id);
}
