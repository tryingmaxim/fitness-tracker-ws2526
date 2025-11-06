package de.hsaa.fitness_tracker_service.trainingsSession;

import com.fasterxml.jackson.annotation.JsonBackReference;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

//@Entity = Tabelle für geplante Einheiten (Trainingssessions)
@Entity
// pro Plan darf es name+datum nur einmal geben
@Table(name = "training_sessions", uniqueConstraints = @UniqueConstraint(columnNames = { "plan_id", "name",
		"scheduled_date" }))
public class TrainingSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Jede Session gehört zu genau einem Trainingsplan
	@ManyToOne(optional = false)
	@JoinColumn(name = "plan_id", nullable = false)
	@JsonBackReference
	private TrainingPlan plan;

	@NotBlank
	@Column(nullable = false)
	private String name;

	@NotNull
	@Column(name = "scheduled_date", nullable = false)
	private LocalDate scheduledDate;

	// Verbindung zu ExerciseExecutions (z. B. geplante Übungen)
	@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private List<ExerciseExecution> exerciseExecutions = new ArrayList<>();

	// --- Getter/Setter ---
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public TrainingPlan getPlan() {
		return plan;
	}

	public void setPlan(TrainingPlan plan) {
		this.plan = plan;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public LocalDate getScheduledDate() {
		return scheduledDate;
	}

	public void setScheduledDate(LocalDate scheduledDate) {
		this.scheduledDate = scheduledDate;
	}

	public List<ExerciseExecution> getExerciseExecutions() {
		return exerciseExecutions;
	}

	public void setExerciseExecutions(List<ExerciseExecution> exerciseExecutions) {
		this.exerciseExecutions = exerciseExecutions;
	}
}
