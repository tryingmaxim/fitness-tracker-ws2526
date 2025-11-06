package de.hsaa.fitness_tracker_service.execution;

import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import de.hsaa.fitness_tracker_service.exercise.Exercise;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

//@Entity=Join-Tabelle zwischen TrainingSession und Exercise
@Entity
//@Table=Eindeutigkeit in einer Session:jede Position und jede Übung darf nur einmal vorkommen
@Table(name = "exercise_executions", uniqueConstraints = {
		@UniqueConstraint(columnNames = { "session_id", "order_index" }),
		@UniqueConstraint(columnNames = { "session_id", "exercise_id" }) })
public class ExerciseExecution {

	// @Id=Primärschlüssel,automatisch generiert
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// @ManyToOne=gehört zu genau einer Session
	@ManyToOne(optional = false)
	@JoinColumn(name = "session_id", nullable = false)
	private TrainingSession session;

	// @ManyToOne=verweist auf genau eine Übung
	@ManyToOne(optional = false)
	@JoinColumn(name = "exercise_id", nullable = false)
	private Exercise exercise;

	// @orderIndex=Reihenfolge in der Session(ab 1)
	@NotNull
	@Min(1)
	@Column(name = "order_index", nullable = false)
	private Integer orderIndex;

	// @notes=optionale Notizen zur Ausführung
	@Column(length = 1000)
	private String notes;

	// Getter/Setter
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public TrainingSession getSession() {
		return session;
	}

	public void setSession(TrainingSession session) {
		this.session = session;
	}

	public Exercise getExercise() {
		return exercise;
	}

	public void setExercise(Exercise exercise) {
		this.exercise = exercise;
	}

	public Integer getOrderIndex() {
		return orderIndex;
	}

	public void setOrderIndex(Integer orderIndex) {
		this.orderIndex = orderIndex;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}
}
