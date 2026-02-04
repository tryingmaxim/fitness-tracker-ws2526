package de.hsaa.fitness_tracker_service.trainingsPlan;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "training_plans", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class TrainingPlan {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	@NotBlank
	@Column(nullable = false, length = 120)
	private String name;

	@NotBlank
	@Column(nullable = false, length = 1000)
	private String description;

	@OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@JsonManagedReference
	private List<de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession> sessions = new ArrayList<>();

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
