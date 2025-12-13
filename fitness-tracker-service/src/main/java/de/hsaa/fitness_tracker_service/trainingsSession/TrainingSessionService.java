package de.hsaa.fitness_tracker_service.trainingsSession;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlanRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TrainingSessionService {

    private final TrainingSessionRepository repo;
    private final TrainingPlanRepository planRepo;

    public TrainingSessionService(TrainingSessionRepository repo, TrainingPlanRepository planRepo) {
        this.repo = repo;
        this.planRepo = planRepo;
    }

    public TrainingSession create(Long planId, String name, Integer orderInPlan) {
        var plan = requirePlan(planId);

        if (orderInPlan == null || orderInPlan < 1 || orderInPlan > 30) {
            throw new IllegalArgumentException("orderInPlan must be between 1 and 30");
        }

        if (repo.countByPlanId(planId) >= 30) {
            throw new IllegalArgumentException("max 30 sessions per plan");
        }

        if (repo.existsByPlanIdAndOrderInPlan(planId, orderInPlan)) {
            throw new DataIntegrityViolationException("orderInPlan already used");
        }

        var s = new TrainingSession();
        s.setPlan(plan);
        s.setName(normalize(name));
        s.setOrderInPlan(orderInPlan);
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

    public TrainingSession update(Long id, Long planId, String name, Integer orderInPlan) {
        var current = get(id);

        if (planId != null && !planId.equals(current.getPlan().getId())) {
            TrainingPlan p = requirePlan(planId);
            current.setPlan(p);
        }

        if (name != null) {
            current.setName(normalize(name));
        }

        if (orderInPlan != null) {
            if (orderInPlan < 1 || orderInPlan > 30) {
                throw new IllegalArgumentException("orderInPlan must be between 1 and 30");
            }
            if (repo.existsByPlanIdAndOrderInPlanAndIdNot(current.getPlan().getId(), orderInPlan, id)) {
                throw new DataIntegrityViolationException("orderInPlan already used");
            }
            current.setOrderInPlan(orderInPlan);
        }

        return current;
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new EntityNotFoundException("session not found");
        }
        repo.deleteById(id);
    }

    private TrainingPlan requirePlan(Long planId) {
        return planRepo.findById(planId)
            .orElseThrow(() -> new EntityNotFoundException("plan not found"));
    }

    private static String normalize(String s) {
        return s == null ? null : s.trim();
    }
}
