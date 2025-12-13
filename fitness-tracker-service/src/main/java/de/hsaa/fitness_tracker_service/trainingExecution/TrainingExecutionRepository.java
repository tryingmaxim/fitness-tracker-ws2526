package de.hsaa.fitness_tracker_service.trainingExecution;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainingExecutionRepository extends JpaRepository<TrainingExecution, Long> {

    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    Optional<TrainingExecution> findWithExercisesById(Long id);
}
