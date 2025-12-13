package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class TrainingExecutionService {

    private final TrainingExecutionRepository repo;
    private final TrainingSessionRepository sessionRepo;
    private final ExerciseRepository exerciseRepo;

    public TrainingExecutionService(
        TrainingExecutionRepository repo,
        TrainingSessionRepository sessionRepo,
        ExerciseRepository exerciseRepo
    ) {
        this.repo = repo;
        this.sessionRepo = sessionRepo;
        this.exerciseRepo = exerciseRepo;
    }

    public TrainingExecution start(Long sessionId) {
        TrainingSession session = requireSessionWithPlannedExercises(sessionId);

        if (session.getExerciseExecutions() == null || session.getExerciseExecutions().isEmpty()) {
            throw new IllegalArgumentException("session must contain at least one exercise");
        }

        TrainingExecution te = new TrainingExecution();
        te.setSession(session);
        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setStartedAt(LocalDateTime.now());
        te.setCompletedAt(null);

        for (ExerciseExecution planned : session.getExerciseExecutions()) {
            ExecutedExercise ee = new ExecutedExercise();
            ee.setTrainingExecution(te);
            ee.setExercise(planned.getExercise());
            ee.setActualSets(0);
            ee.setActualReps(0);
            ee.setActualWeightKg(0.0);
            ee.setDone(false);
            ee.setNotes(null);
            te.getExecutedExercises().add(ee);
        }

        return repo.save(te);
    }

    @Transactional(readOnly = true)
    public TrainingExecution get(Long id) {
        return repo.findWithExercisesById(id)
            .orElseThrow(() -> new EntityNotFoundException("training execution not found"));
    }

    public TrainingExecution upsertExecutedExercise(
        Long executionId,
        Long exerciseId,
        Integer actualSets,
        Integer actualReps,
        Double actualWeightKg,
        boolean done,
        String notes
    ) {
        TrainingExecution te = get(executionId);

        if (te.getStatus() != TrainingExecution.Status.IN_PROGRESS) {
            throw new IllegalArgumentException("training is not editable");
        }

        if (actualSets == null || actualSets < 0) {
            throw new IllegalArgumentException("actualSets must be >= 0");
        }
        if (actualReps == null || actualReps < 0) {
            throw new IllegalArgumentException("actualReps must be >= 0");
        }
        if (actualWeightKg == null || actualWeightKg < 0) {
            throw new IllegalArgumentException("actualWeightKg must be >= 0");
        }

        Exercise ex = requireExercise(exerciseId);

        ExecutedExercise target = te.getExecutedExercises().stream()
            .filter(e -> e.getExercise().getId().equals(exerciseId))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("exercise not part of this execution"));

        target.setExercise(ex);
        target.setActualSets(actualSets);
        target.setActualReps(actualReps);
        target.setActualWeightKg(actualWeightKg);
        target.setDone(done);
        target.setNotes(notes != null ? notes.trim() : null);

        return te;
    }

    public TrainingExecution complete(Long id) {
        TrainingExecution te = get(id);

        if (te.getStatus() != TrainingExecution.Status.IN_PROGRESS) {
            throw new IllegalArgumentException("training already completed");
        }

        te.setStatus(TrainingExecution.Status.COMPLETED);
        te.setCompletedAt(LocalDateTime.now());
        return te;
    }

    public void cancel(Long id) {
        TrainingExecution te = get(id);

        if (te.getStatus() == TrainingExecution.Status.COMPLETED) {
            throw new IllegalArgumentException("completed trainings cannot be deleted");
        }

        repo.delete(te);
    }

    private TrainingSession requireSessionWithPlannedExercises(Long id) {
        return sessionRepo.findWithExecutionsById(id)
            .orElseThrow(() -> new EntityNotFoundException("session not found"));
    }

    private Exercise requireExercise(Long id) {
        return exerciseRepo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("exercise not found"));
    }
}
