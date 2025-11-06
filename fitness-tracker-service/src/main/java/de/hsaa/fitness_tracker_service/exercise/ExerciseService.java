package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
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

	public Exercise create(@Valid Exercise e) {
		if (repo.existsByNameIgnoreCase(e.getName())) {
			// Euer GlobalExceptionHandler mappt DataIntegrityViolationException -> 409
			// CONFLICT
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
}
