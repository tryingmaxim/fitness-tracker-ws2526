package de.hsaa.fitness_tracker_service.execution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

//@Repository=DB-Zugriffe für ExerciseExecution
public interface ExerciseExecutionRepository extends JpaRepository<ExerciseExecution, Long> {

	// Alle Ausführungen einer Session in Reihenfolge
	List<ExerciseExecution> findBySessionIdOrderByOrderIndexAsc(Long sessionId);

	// Duplikatprüfungen innerhalb einer Session
	boolean existsBySessionIdAndOrderIndex(Long sessionId, Integer orderIndex);

	boolean existsBySessionIdAndExerciseId(Long sessionId, Long exerciseId);

	// Varianten für Update(Duplikat außer dem aktuellen Datensatz)
	boolean existsBySessionIdAndOrderIndexAndIdNot(Long sessionId, Integer orderIndex, Long id);

	boolean existsBySessionIdAndExerciseIdAndIdNot(Long sessionId, Long exerciseId, Long id);
}
