package de.hsaa.fitness_tracker_service.trainingsSession;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlanRepository;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecution;
import de.hsaa.fitness_tracker_service.trainingExecution.TrainingExecutionRepository;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDayRepository;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class TrainingSessionService {

    private final TrainingSessionRepository repo;
    private final TrainingPlanRepository planRepo;
    private final TrainingExecutionRepository trainingExecutionRepo;
    private final SessionDayRepository sessionDayRepo;

    public TrainingSessionService(
        TrainingSessionRepository repo,
        TrainingPlanRepository planRepo,
        TrainingExecutionRepository trainingExecutionRepo,
        SessionDayRepository sessionDayRepo
    ) {
        this.repo = repo;
        this.planRepo = planRepo;
        this.trainingExecutionRepo = trainingExecutionRepo;
        this.sessionDayRepo = sessionDayRepo;
    }

    public TrainingSession create(Long planId, String name, List<Integer> days) {
        TrainingPlan plan = requirePlan(planId);
        List<Integer> normalizedDays = normalizeDays(days);

        for (Integer d : normalizedDays) {
            if (sessionDayRepo.existsByPlanIdAndDay(planId, d)) {
                throw new DataIntegrityViolationException("day already used in plan: " + d);
            }
        }

        TrainingSession s = new TrainingSession();
        s.setPlan(plan);
        s.setName(normalize(name));

        for (Integer d : normalizedDays) {
            SessionDay sd = new SessionDay();
            sd.setDay(d);
            sd.setSession(s);
            s.getDays().add(sd);
        }

        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public Page<TrainingSession> list(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<TrainingSession> listByPlan(Long planId, Pageable pageable) {
        requirePlan(planId);
        return repo.findAllByPlanId(planId, pageable);
    }

    @Transactional(readOnly = true)
    public TrainingSession get(Long id) {
        return repo.findWithExecutionsById(id)
            .orElseThrow(() -> new EntityNotFoundException("session not found"));
    }

    public TrainingSession update(Long id, Long planId, String name, List<Integer> days) {
        TrainingSession current = get(id);

        if (planId != null && current.getPlan() != null && !planId.equals(current.getPlan().getId())) {
            current.setPlan(requirePlan(planId));
        }

        if (name != null) {
            current.setName(normalize(name));
        }

        if (days != null) {
            List<Integer> normalizedDays = normalizeDays(days);
            Long effectivePlanId = current.getPlan().getId();

            for (Integer d : normalizedDays) {
                if (sessionDayRepo.existsByPlanIdAndDayAndSessionIdNot(effectivePlanId, d, id)) {
                    throw new DataIntegrityViolationException("day already used in plan: " + d);
                }
            }
            	
            current.getDays().clear();
            repo.saveAndFlush(current);
            for (Integer d : normalizedDays) {
                SessionDay sd = new SessionDay();
                sd.setDay(d);
                sd.setSession(current);
                current.getDays().add(sd);
            }
        }

        return current;
    }

    /**
     * Hard delete: aber Executions bleiben erhalten.
     * Wir detach-en alle TrainingExecutions, backfill-en Snapshot-Felder und löschen danach die Session.
     */
    public void delete(Long id) {
        TrainingSession s = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("session not found"));

        String sessionName = s.getName();
        String planName = (s.getPlan() != null ? s.getPlan().getName() : null);

        // Alle Executions holen, solange sie noch per FK verlinkt sind
        List<TrainingExecution> executions = trainingExecutionRepo.findBySessionId(id);

        if (executions != null && !executions.isEmpty()) {
            for (TrainingExecution te : executions) {
                // Snapshot backfill
                if (te.getSessionIdSnapshot() == null) te.setSessionIdSnapshot(id);

                if (te.getSessionNameSnapshot() == null || te.getSessionNameSnapshot().isBlank()) {
                    te.setSessionNameSnapshot(sessionName);
                }

                if (te.getPlanNameSnapshot() == null || te.getPlanNameSnapshot().isBlank()) {
                    te.setPlanNameSnapshot(planName);
                }

                // detach
                te.setSession(null);
            }
            trainingExecutionRepo.saveAll(executions);
        }

        repo.delete(s);
    }

    private TrainingPlan requirePlan(Long planId) {
        return planRepo.findById(planId)
            .orElseThrow(() -> new EntityNotFoundException("plan not found"));
    }

    private static String normalize(String s) {
        return s == null ? null : s.trim();
    }

    private static List<Integer> normalizeDays(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            throw new IllegalArgumentException("days must not be empty");
        }

        List<Integer> distinct = days.stream()
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        for (Integer d : distinct) {
            if (d < 1 || d > 30) {
                throw new IllegalArgumentException("day must be between 1 and 30");
            }
        }

        return distinct;
    }
}
