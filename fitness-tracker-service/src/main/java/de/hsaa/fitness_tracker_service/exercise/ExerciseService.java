package de.hsaa.fitness_tracker_service.exercise;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class ExerciseService {

	private final ExerciseRepository repo;

	public ExerciseService(ExerciseRepository repo) {
		this.repo = repo;
	}

	@Transactional(readOnly = true)
	public Page<Exercise> list(Pageable pageable) {
		return repo.findByArchivedFalse(pageable);
	}

	@Transactional(readOnly = true)
	public Exercise get(Long id) {
		Exercise ex = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));

		if (ex.isArchived()) {
			throw new EntityNotFoundException("exercise not found");
		}

		return ex;
	}

	public Exercise create(Exercise body) {
		body.setId(null);
		body.setArchived(false);
		normalize(body);
		return repo.save(body);
	}

	public Exercise update(Long id, Exercise body) {
		Exercise current = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));

		if (current.isArchived()) {
			throw new EntityNotFoundException("exercise not found");
		}

		if (body.getName() != null)
			current.setName(body.getName());
		if (body.getCategory() != null)
			current.setCategory(body.getCategory());
		if (body.getDescription() != null)
			current.setDescription(body.getDescription());
		if (body.getMuscleGroups() != null)
			current.setMuscleGroups(body.getMuscleGroups());

		normalize(current);
		return current;
	}

	public void delete(Long id) {
		Exercise current = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));

		if (current.isArchived())
			return;

		current.setArchived(true);
	}

	private void normalize(Exercise ex) {
		if (ex.getName() != null)
			ex.setName(ex.getName().trim());
		if (ex.getCategory() != null)
			ex.setCategory(ex.getCategory().trim());
		if (ex.getDescription() != null)
			ex.setDescription(ex.getDescription().trim());
		if (ex.getMuscleGroups() != null)
			ex.setMuscleGroups(ex.getMuscleGroups().trim());
	}
}
