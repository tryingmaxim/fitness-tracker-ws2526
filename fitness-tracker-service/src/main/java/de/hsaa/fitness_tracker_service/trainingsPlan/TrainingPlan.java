package de.hsaa.fitness_tracker_service.trainingsPlan;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "training_plans", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class TrainingPlan {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Column(nullable = false)
	private String name;

	@Column(length = 1000)
	private String description;


	@OneToMany
	(mappedBy = "plan",
	cascade = CascadeType.ALL,
	orphanRemoval = true,
	fetch = FetchType.LAZY)
	
	private List<de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession> sessions = new ArrayList<>();

	// Getter/Setter
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public List<de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession> getSessions() {
		return sessions;
	}

	public void setSessions(List<de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession> sessions) {
		this.sessions = sessions;
	}
}
