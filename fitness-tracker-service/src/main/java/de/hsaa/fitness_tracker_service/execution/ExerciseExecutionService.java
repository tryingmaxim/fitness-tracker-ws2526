package de.hsaa.fitness_tracker_service.execution;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class ExerciseExecutionService {

    private final ExerciseExecutionRepository repo;
    private final TrainingSessionRepository sessionRepo;
    private final ExerciseRepository exerciseRepo;

    public ExerciseExecutionService(
        ExerciseExecutionRepository repo,
        TrainingSessionRepository sessionRepo,
        ExerciseRepository exerciseRepo
    ) {
        this.repo = repo;
        this.sessionRepo = sessionRepo;
        this.exerciseRepo = exerciseRepo;
    }

    public ExerciseExecution add(
        Long sessionId,
        Long exerciseId,
        Integer orderIndex,
        Integer plannedSets,
        Integer plannedReps,
        Double plannedWeightKg,
        String notes
    ) {
        var session = requireSession(sessionId);
        var exercise = requireExercise(exerciseId);

        if (orderIndex == null || orderIndex < 1) {
            throw new IllegalArgumentException("orderIndex must be >= 1");
        }
        if (plannedSets == null || plannedSets < 1) {
            throw new IllegalArgumentException("plannedSets must be >= 1");
        }
        if (plannedReps == null || plannedReps < 1) {
            throw new IllegalArgumentException("plannedReps must be >= 1");
        }
        if (plannedWeightKg == null || plannedWeightKg < 0) {
            throw new IllegalArgumentException("plannedWeightKg must be >= 0");
        }

        if (repo.existsBySessionIdAndOrderIndex(sessionId, orderIndex)) {
            throw new DataIntegrityViolationException("duplicate orderIndex in session");
        }
        if (repo.existsBySessionIdAndExerciseId(sessionId, exerciseId)) {
            throw new DataIntegrityViolationException("exercise already in session");
        }

        var ee = new ExerciseExecution();
        ee.setSession(session);
        ee.setExercise(exercise);
        ee.setOrderIndex(orderIndex);
        ee.setPlannedSets(plannedSets);
        ee.setPlannedReps(plannedReps);
        ee.setPlannedWeightKg(plannedWeightKg);
        ee.setNotes(notes != null ? notes.trim() : null);
        return repo.save(ee);
    }

    @Transactional(readOnly = true)
    public List<ExerciseExecution> list(Long sessionId) {
        requireSession(sessionId);
        return repo.findBySessionIdOrderByOrderIndexAsc(sessionId);
    }

    public ExerciseExecution update(
        Long sessionId,
        Long id,
        Long exerciseId,
        Integer orderIndex,
        Integer plannedSets,
        Integer plannedReps,
        Double plannedWeightKg,
        String notes
    ) {
        var current = getInSession(sessionId, id);

        if (exerciseId != null && !exerciseId.equals(current.getExercise().getId())) {
            Exercise ex = requireExercise(exerciseId);
            if (repo.existsBySessionIdAndExerciseIdAndIdNot(sessionId, exerciseId, id)) {
                throw new DataIntegrityViolationException("exercise already in session");
            }
            current.setExercise(ex);
        }

        if (orderIndex != null) {
            if (orderIndex < 1) {
                throw new IllegalArgumentException("orderIndex must be >= 1");
            }
            if (repo.existsBySessionIdAndOrderIndexAndIdNot(sessionId, orderIndex, id)) {
                throw new DataIntegrityViolationException("duplicate orderIndex in session");
            }
            current.setOrderIndex(orderIndex);
        }

        if (plannedSets != null) {
            if (plannedSets < 1) {
                throw new IllegalArgumentException("plannedSets must be >= 1");
            }
            current.setPlannedSets(plannedSets);
        }

        if (plannedReps != null) {
            if (plannedReps < 1) {
                throw new IllegalArgumentException("plannedReps must be >= 1");
            }
            current.setPlannedReps(plannedReps);
        }

        if (plannedWeightKg != null) {
            if (plannedWeightKg < 0) {
                throw new IllegalArgumentException("plannedWeightKg must be >= 0");
            }
            current.setPlannedWeightKg(plannedWeightKg);
        }

        if (notes != null) {
            current.setNotes(notes.trim());
        }

        return current;
    }

    public void delete(Long sessionId, Long id) {
        var current = getInSession(sessionId, id);
        repo.delete(current);
    }

    private TrainingSession requireSession(Long id) {
        return sessionRepo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("session not found"));
    }

    private Exercise requireExercise(Long id) {
        return exerciseRepo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("exercise not found"));
    }

    private ExerciseExecution getInSession(Long sessionId, Long id) {
        var ee = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("execution not found"));
        if (!ee.getSession().getId().equals(sessionId)) {
            throw new EntityNotFoundException("execution not found");
        }
        return ee;
    }
}
