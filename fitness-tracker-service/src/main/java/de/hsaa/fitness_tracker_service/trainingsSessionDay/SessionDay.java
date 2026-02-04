package de.hsaa.fitness_tracker_service.trainingsSessionDay;

import com.fasterxml.jackson.annotation.JsonBackReference;

import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "session_days", uniqueConstraints = { @UniqueConstraint(columnNames = { "session_id", "day_number" }) })
public class SessionDay {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotNull
	@Min(1)
	@Max(30)
	@Column(name = "day_number", nullable = false)
	private Integer day;

	@ManyToOne(optional = false)
	@JoinColumn(name = "session_id", nullable = false)
	@JsonBackReference
	private TrainingSession session;

	public Long getId() {
		return id;
	}

	public Integer getDay() {
		return day;
	}

	public void setDay(Integer day) {
		this.day = day;
	}

	public TrainingSession getSession() {
		return session;
	}

	public void setSession(TrainingSession session) {
		this.session = session;
	}
}
