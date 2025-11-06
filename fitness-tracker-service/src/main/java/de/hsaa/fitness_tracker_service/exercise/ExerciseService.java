package de.hsaa.fitness_tracker_service.exercise.service;

import de.hsaa.fitness_tracker_service.exercise.domain.Exercise;
import de.hsaa.fitness_tracker_service.exercise.repo.ExerciseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExerciseService {
	private final ExerciseRepository repo;

	public ExerciseService(ExerciseRepository repo) {
		this.repo = repo;
	}

	public Exercise create(Exercise e) {
		if (repo.existsByNameIgnoreCase(e.getName())) {
			throw new DataIntegrityViolationException("exercise name already exists");
		}
		return repo.save(e);
	}

	@Transactional(readOnly = true)
	public Page<Exercise> list(Pageable pageable) {
		return repo.findAll(pageable);
	}

	@Transactional(readOnly = true)
	public Exercise get(Long id) {
		return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));
	}

	public Exercise update(Long id, Exercise patch) {
		var current = get(id);
		current.setName(patch.getName());
		current.setCategory(patch.getCategory());
		current.setDescription(patch.getDescription());
		current.setMuscleGroupsCsv(patch.getMuscleGroupsCsv());
		return repo.save(current);
	}

	public void delete(Long id) {
		if (!repo.existsById(id))
			throw new EntityNotFoundException("exercise not found");
		repo.deleteById(id);
	}
}
