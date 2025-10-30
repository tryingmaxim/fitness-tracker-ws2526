package de.hsaa.fitness_tracker_service.exercise.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "exercises", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class Exercise {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Column(nullable = false)
	private String name;

	@NotBlank
	@Column(nullable = false)
	private String category;

	@Column(length = 1000)
	private String description;

	/** Minimal: als CSV; später normalisieren */
	private String muscleGroupsCsv;

	// getters/setters
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

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getMuscleGroupsCsv() {
		return muscleGroupsCsv;
	}

	public void setMuscleGroupsCsv(String muscleGroupsCsv) {
		this.muscleGroupsCsv = muscleGroupsCsv;
	}
}
