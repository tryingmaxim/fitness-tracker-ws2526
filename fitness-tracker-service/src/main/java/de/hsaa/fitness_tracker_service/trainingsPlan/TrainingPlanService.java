package de.hsaa.fitness_tracker_service.trainingsPlan;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

//@Service=Business-Logik;@Transactional=Transaktionsgrenze
@Service
@Transactional
public class TrainingPlanService {

	private final TrainingPlanRepository repo;

	// Konstruktor-Injection
	public TrainingPlanService(TrainingPlanRepository repo) {
		this.repo = repo;
	}

	// Create:neuen Plan anlegen
	public TrainingPlan create(TrainingPlan p) {
		normalize(p);// Texte trimmen
		if (repo.existsByNameIgnoreCase(p.getName())) {
			// 409 CONFLICT,wenn Planname schon existiert
			throw new DataIntegrityViolationException("plan name already exists");
		}
		return repo.save(p);
	}

	// Read:Liste mit Pagination
	@Transactional(readOnly = true)
	public Page<TrainingPlan> list(Pageable pageable) {
		return repo.findAll(pageable);
	}

	// Read:Einzelner Plan
	@Transactional(readOnly = true)
	public TrainingPlan get(Long id) {
		return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("plan not found"));
	}

	// Update:Plan-Daten ändern
	public TrainingPlan update(Long id, TrainingPlan patch) {
		var current = get(id);// existierenden Plan laden
		if (patch.getName() != null)
			current.setName(patch.getName());
		if (patch.getDescription() != null)
			current.setDescription(patch.getDescription());
		normalize(current);
		// 409,wenn ein anderer Plan bereits denselben Namen nutzt
		if (repo.existsByNameIgnoreCaseAndIdNot(current.getName(), id)) {
			throw new DataIntegrityViolationException("plan name already exists");
		}
		return current;// wird durch JPA automatisch geflusht
	}

	// Delete:Plan löschen
	public void delete(Long id) {
		if (!repo.existsById(id))
			throw new EntityNotFoundException("plan not found");
		repo.deleteById(id);
	}

	// Hilfsfunktion:Strings trimmen
	private static void normalize(TrainingPlan p) {
		if (p.getName() != null)
			p.setName(p.getName().trim());
		if (p.getDescription() != null)
			p.setDescription(p.getDescription().trim());
	}
}
