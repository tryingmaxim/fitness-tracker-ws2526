package de.hsaa.fitness_tracker_service.execution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import de.hsaa.fitness_tracker_service.exercise.ExerciseRepository;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

//@Service=Geschäftslogik für die m:n-Join-Entität
@Service
@Transactional
public class ExerciseExecutionService {

	private final ExerciseExecutionRepository repo;
	private final TrainingSessionRepository sessionRepo;
	private final ExerciseRepository exerciseRepo;

	// Konstruktor-Injection
	public ExerciseExecutionService(ExerciseExecutionRepository repo, TrainingSessionRepository sessionRepo,
			ExerciseRepository exerciseRepo) {
		this.repo = repo;
		this.sessionRepo = sessionRepo;
		this.exerciseRepo = exerciseRepo;
	}

	// Create:Übung in Session einplanen
	public ExerciseExecution add(Long sessionId, Long exerciseId, Integer orderIndex, String notes) {
		var session = requireSession(sessionId);// 404 falls Session fehlt
		var exercise = requireExercise(exerciseId);// 404 falls Übung fehlt

		// 409 keine doppelte Position
		if (repo.existsBySessionIdAndOrderIndex(sessionId, orderIndex)) {
			throw new DataIntegrityViolationException("duplicate orderIndex in session");
		}
		// 409 keine doppelte Übung
		if (repo.existsBySessionIdAndExerciseId(sessionId, exerciseId)) {
			throw new DataIntegrityViolationException("exercise already in session");
		}

		var ee = new ExerciseExecution();
		ee.setSession(session);
		ee.setExercise(exercise);
		ee.setOrderIndex(orderIndex);
		ee.setNotes(notes != null ? notes.trim() : null);
		return repo.save(ee);
	}

	// Read:alle Ausführungen einer Session
	@Transactional(readOnly = true)
	public List<ExerciseExecution> list(Long sessionId) {
		requireSession(sessionId);// 404 falls Session fehlt
		return repo.findBySessionIdOrderByOrderIndexAsc(sessionId);
	}

	// Update:Übung/Position/Notizen ändern
	public ExerciseExecution update(Long sessionId, Long id, Long exerciseId, Integer orderIndex, String notes) {
		var current = getInSession(sessionId, id);// 404 wenn nicht in dieser Session

		if (exerciseId != null && !exerciseId.equals(current.getExercise().getId())) {
			Exercise ex = requireExercise(exerciseId);
			if (repo.existsBySessionIdAndExerciseIdAndIdNot(sessionId, exerciseId, id)) {
				throw new DataIntegrityViolationException("exercise already in session");
			}
			current.setExercise(ex);
		}
		if (orderIndex != null) {
			if (repo.existsBySessionIdAndOrderIndexAndIdNot(sessionId, orderIndex, id)) {
				throw new DataIntegrityViolationException("duplicate orderIndex in session");
			}
			current.setOrderIndex(orderIndex);
		}
		if (notes != null)
			current.setNotes(notes.trim());

		return current;// Dirty-Checking speichert automatisch
	}

	// Delete:Ausführung entfernen
	public void delete(Long sessionId, Long id) {
		var current = getInSession(sessionId, id);
		repo.delete(current);
	}

	// Hilfen
	private TrainingSession requireSession(Long id) {
		return sessionRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("session not found"));
	}

	private Exercise requireExercise(Long id) {
		return exerciseRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("exercise not found"));
	}

	private ExerciseExecution getInSession(Long sessionId, Long id) {
		var ee = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("execution not found"));
		if (!ee.getSession().getId().equals(sessionId)) {
			throw new EntityNotFoundException("execution not found");
		}
		return ee;
	}
}
