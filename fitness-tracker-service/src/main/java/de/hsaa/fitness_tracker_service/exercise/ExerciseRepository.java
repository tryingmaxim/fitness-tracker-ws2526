package de.hsaa.fitness_tracker_service.exercise;

import org.springframework.data.jpa.repository.JpaRepository;

//Dieses Interface stellt alle Standard-Datenbankfunktionen bereit(z.B.findAll,save,deleteById)
//JpaRepository<Exercise,Long> bedeutet: Tabelle=Exercise,Primärschlüsseltyp=Long
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

	// Eigene Methode,um zu prüfen,ob eine Übung mit diesem Namen schon existiert
	boolean existsByNameIgnoreCase(String name);

	// Erweiterte Methode für Update: prüft,ob Name bei einem anderen Datensatz vorkommt
	boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
