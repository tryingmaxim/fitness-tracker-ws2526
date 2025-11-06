package de.hsaa.fitness_tracker_service.trainingsSession;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;

@Entity
@Table(name = "training_sessions", uniqueConstraints = @UniqueConstraint(columnNames = { "plan_id", "name",
		"scheduled_date" }))
public class TrainingSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false)
	@JoinColumn(name = "plan_id", nullable = false)
	private TrainingPlan plan;

	@NotBlank
	@Column(nullable = false)
	private String name;

	@NotNull
	@Column(name = "scheduled_date", nullable = false)
	private LocalDate scheduledDate;

	// getters/setters
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
}
