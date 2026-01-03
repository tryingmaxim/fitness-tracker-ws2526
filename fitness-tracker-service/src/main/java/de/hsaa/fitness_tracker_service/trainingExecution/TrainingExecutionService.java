package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import de.hsaa.fitness_tracker_service.user.User;
import de.hsaa.fitness_tracker_service.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Service
@Transactional
public class TrainingExecutionService {

    private final TrainingExecutionRepository repo;
    private final TrainingSessionRepository sessionRepo;
    private final ExerciseRepository exerciseRepo;
    private final UserRepository userRepo;

    public TrainingExecutionService(
        TrainingExecutionRepository repo,
        TrainingSessionRepository sessionRepo,
        ExerciseRepository exerciseRepo,
        UserRepository userRepo
    ) {
        this.repo = repo;
        this.sessionRepo = sessionRepo;
        this.exerciseRepo = exerciseRepo;
        this.userRepo = userRepo;
    }

    public TrainingExecution start(Long sessionId) {
        TrainingSession session = requireSessionWithPlannedExercises(sessionId);

        if (session.getExerciseExecutions() == null || session.getExerciseExecutions().isEmpty()) {
            throw new IllegalArgumentException("session must contain at least one exercise");
        }

        User currentUser = getCurrentUser();

        TrainingExecution te = new TrainingExecution();
        te.setUser(currentUser); // ✅ WICHTIG: Owner setzen
        te.setSession(session);

        // Snapshot der Session-Metadaten für Progress/History
        te.setSessionIdSnapshot(session.getId());
        te.setSessionNameSnapshot(session.getName());
        te.setPlanNameSnapshot(session.getPlan() != null ? session.getPlan().getName() : null);

        te.setStatus(TrainingExecution.Status.IN_PROGRESS);
        te.setStartedAt(LocalDateTime.now());
        te.setCompletedAt(null);

        for (ExerciseExecution planned : session.getExerciseExecutions()) {
            ExecutedExercise ee = new ExecutedExercise();
            ee.setTrainingExecution(te);

            Exercise ex = planned.getExercise();
            ee.setExercise(ex);

            // Snapshot der Übung (Name/Kategorie) für Progress/History
            ee.setExerciseNameSnapshot(ex != null ? ex.getName() : null);
            ee.setExerciseCategorySnapshot(ex != null ? ex.getCategory() : null);

            ee.setPlannedSets(planned.getPlannedSets());
            ee.setPlannedReps(planned.getPlannedReps());
            ee.setPlannedWeightKg(planned.getPlannedWeightKg());

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
        TrainingExecution te = repo.findWithExercisesById(id)
            .orElseThrow(() -> new EntityNotFoundException("training execution not found"));

        assertOwner(te);
        return te;
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
        TrainingExecution te = get(executionId); // get() prüft Owner already

        if (te.getStatus() != TrainingExecution.Status.IN_PROGRESS) {
            throw new IllegalArgumentException("training is not editable");
        }

        if (actualSets == null || actualSets < 0) throw new IllegalArgumentException("actualSets must be >= 0");
        if (actualReps == null || actualReps < 0) throw new IllegalArgumentException("actualReps must be >= 0");
        if (actualWeightKg == null || actualWeightKg < 0) throw new IllegalArgumentException("actualWeightKg must be >= 0");

        Exercise ex = requireExercise(exerciseId);

        ExecutedExercise target = te.getExecutedExercises().stream()
            .filter(e -> e.getExercise() != null && e.getExercise().getId().equals(exerciseId))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("exercise not part of this execution"));

        target.setExercise(ex);

        // Snapshot nachziehen, falls neue Daten fehlen
        if (target.getExerciseNameSnapshot() == null || target.getExerciseNameSnapshot().isBlank()) {
            target.setExerciseNameSnapshot(ex.getName());
        }
        if (target.getExerciseCategorySnapshot() == null || target.getExerciseCategorySnapshot().isBlank()) {
            target.setExerciseCategorySnapshot(ex.getCategory());
        }

        target.setActualSets(actualSets);
        target.setActualReps(actualReps);
        target.setActualWeightKg(actualWeightKg);
        target.setDone(done);
        target.setNotes(notes != null ? notes.trim() : null);

        return te;
    }

    public TrainingExecution complete(Long id) {
        TrainingExecution te = get(id); // Owner check

        if (te.getStatus() != TrainingExecution.Status.IN_PROGRESS) {
            throw new IllegalArgumentException("training already completed");
        }

        te.setStatus(TrainingExecution.Status.COMPLETED);
        te.setCompletedAt(LocalDateTime.now());
        return te;
    }

    public void cancel(Long id) {
        TrainingExecution te = get(id); // Owner check

        if (te.getStatus() == TrainingExecution.Status.COMPLETED) {
            throw new IllegalArgumentException("completed trainings cannot be deleted");
        }

        repo.delete(te);
    }

    @Transactional(readOnly = true)
    public List<TrainingExecution> listBySession(Long sessionId) {
        User currentUser = getCurrentUser();
        return repo.findWithExercisesBySessionOrSnapshotAndUser(sessionId, currentUser);
    }

    @Transactional(readOnly = true)
    public List<TrainingExecution> listAll() {
        User currentUser = getCurrentUser();
        return repo.findAllWithExercisesByUser(currentUser);
    }

    @Transactional(readOnly = true)
    public int calculateCompletedStreakDays() {
        User currentUser = getCurrentUser();

        List<TrainingExecution> list =
        	    repo.findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
        	        currentUser,
        	        TrainingExecution.Status.COMPLETED
        	    );


        if (list.isEmpty()) return 0;

        // distinct Tage in Reihenfolge: newest -> oldest
        java.util.LinkedHashSet<LocalDate> daysDesc = new java.util.LinkedHashSet<>();
        for (TrainingExecution te : list) {
            daysDesc.add(te.getCompletedAt().toLocalDate());
        }

        if (daysDesc.isEmpty()) return 0;

        LocalDate today = LocalDate.now();
        LocalDate lastDay = daysDesc.iterator().next();

        // Wenn letztes Training NICHT heute oder gestern war -> aktueller Streak = 0
        if (lastDay.isBefore(today.minusDays(1))) {
            return 0;
        }

        int streak = 0;
        LocalDate cursor = lastDay;

        while (daysDesc.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        return streak;
    }


    private TrainingSession requireSessionWithPlannedExercises(Long id) {
        return sessionRepo.findWithExecutionsById(id)
            .orElseThrow(() -> new EntityNotFoundException("session not found"));
    }

    private Exercise requireExercise(Long id) {
        return exerciseRepo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("exercise not found"));
    }

    // aktueller User aus SecurityContext → DB User holen
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;

        if (username == null || username.isBlank()) {
            throw new AccessDeniedException("Not authenticated");
        }

        return userRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("User not found: " + username));
    }

    // 403 wenn nicht Owner
    private void assertOwner(TrainingExecution te) {
        User currentUser = getCurrentUser();
        if (te.getUser() == null || te.getUser().getId() == null) {
            throw new AccessDeniedException("Owner missing");
        }
        if (!te.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Forbidden");
        }
    }
}
