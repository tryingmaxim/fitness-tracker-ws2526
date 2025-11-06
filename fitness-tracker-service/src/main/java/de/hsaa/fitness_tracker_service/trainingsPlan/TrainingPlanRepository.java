package de.hsaa.fitness_tracker_service.trainingsPlan;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

//@Repository-Schicht für DB-Zugriffe(CRUD+Custom-Queries)
public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {

	// Prüfen,ob Name schon existiert(duplikat-unabhängig von Groß/Kleinschreibung)
	boolean existsByNameIgnoreCase(String name);

	// Variante für Update: existiert der Name bei einem anderen Datensatz?
	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

	// @EntityGraph lädt bei Bedarf die Sessions direkt mit(Lazy umgehen für Detail-Ansicht)
	@EntityGraph(attributePaths = "sessions")
	Optional<TrainingPlan> findWithSessionsById(Long id);
}
