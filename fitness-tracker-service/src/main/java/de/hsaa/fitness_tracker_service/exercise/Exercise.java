package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "exercises", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class Exercise {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotBlank
	@Column(nullable = false, unique = true)
	private String name;

	@NotBlank
	@Column(nullable = false)
	private String category;

	@Column(length = 1000)
	private String description;

	@NotBlank
	@Column(name = "muscle_groups", nullable = false)
	private String muscleGroups;
	
	

	public Exercise() {
	}

	@JsonProperty("muscleGroups")
	public String getMuscleGroups() {
		return muscleGroups;
	}

	@JsonProperty("muscleGroups")
	public void setMuscleGroups(String muscleGroups) {
		this.muscleGroups = muscleGroups;
	}

	// --- Getter/Setter ---
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
}
