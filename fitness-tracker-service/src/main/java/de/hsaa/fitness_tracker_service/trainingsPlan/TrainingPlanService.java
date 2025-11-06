package de.hsaa.fitness_tracker_service.trainingsPlan;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TrainingPlanService {
	private final TrainingPlanRepository repo;

	public TrainingPlanService(TrainingPlanRepository repo) {
		this.repo = repo;
	}

	public TrainingPlan create(TrainingPlan p) {
		if (repo.existsByNameIgnoreCase(p.getName())) {
			throw new DataIntegrityViolationException("plan name already exists");
		}
		return repo.save(p);
	}

	@Transactional(readOnly = true)
	public Page<TrainingPlan> list(Pageable pageable) {
		return repo.findAll(pageable);
	}

	@Transactional(readOnly = true)
	public TrainingPlan get(Long id) {
		return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("plan not found"));
	}

	public TrainingPlan update(Long id, TrainingPlan patch) {
		var current = get(id);
		current.setName(patch.getName());
		current.setDescription(patch.getDescription());
		return repo.save(current);
	}

	public void delete(Long id) {
		if (!repo.existsById(id))
			throw new EntityNotFoundException("plan not found");
		repo.deleteById(id);
	}
}
