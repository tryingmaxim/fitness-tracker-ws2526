package de.hsaa.fitness_tracker_service.trainingsSession;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlanRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional
public class TrainingSessionService {
	private final TrainingSessionRepository repo;
	private final TrainingPlanRepository planRepo;

	public TrainingSessionService(TrainingSessionRepository repo, TrainingPlanRepository planRepo) {
		this.repo = repo;
		this.planRepo = planRepo;
	}

	public TrainingSession create(Long planId, String name, LocalDate date) {
		var plan = planRepo.findById(planId).orElseThrow(() -> new EntityNotFoundException("plan not found"));
		if (repo.existsByPlanIdAndNameIgnoreCaseAndScheduledDate(planId, name, date)) {
			throw new DataIntegrityViolationException("session duplicate for plan+name+date");
		}
		var s = new TrainingSession();
		s.setPlan(plan);
		s.setName(name);
		s.setScheduledDate(date);
		return repo.save(s);
	}

	@Transactional(readOnly = true)
	public Page<TrainingSession> list(Pageable pageable) {
		return repo.findAll(pageable);
	}

	@Transactional(readOnly = true)
	public TrainingSession get(Long id) {
		return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("session not found"));
	}

	public TrainingSession update(Long id, Long planId, String name, LocalDate date) {
		var current = get(id);
		if (planId != null && !planId.equals(current.getPlan().getId())) {
			TrainingPlan plan = planRepo.findById(planId)
					.orElseThrow(() -> new EntityNotFoundException("plan not found"));
			current.setPlan(plan);
		}
		if (name != null)
			current.setName(name);
		if (date != null)
			current.setScheduledDate(date);
		return repo.save(current);
	}

	public void delete(Long id) {
		if (!repo.existsById(id))
			throw new EntityNotFoundException("session not found");
		repo.deleteById(id);
	}
}
