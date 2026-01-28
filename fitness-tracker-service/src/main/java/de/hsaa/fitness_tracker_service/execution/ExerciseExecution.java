package de.hsaa.fitness_tracker_service.execution;

import com.fasterxml.jackson.annotation.JsonBackReference;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
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
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(
    name = "exercise_executions",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = { "session_id", "order_index" }),
        @UniqueConstraint(columnNames = { "session_id", "exercise_id" })
    }
)
public class ExerciseExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonBackReference("session-executions")
    private TrainingSession session;

    @ManyToOne(optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @NotNull
    @Min(1)
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer plannedSets;

    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer plannedReps;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Double plannedWeightKg;

    @Column(length = 1000)
    private String notes;

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

    public Integer getPlannedSets() {
        return plannedSets;
    }

    public void setPlannedSets(Integer plannedSets) {
        this.plannedSets = plannedSets;
    }

    public Integer getPlannedReps() {
        return plannedReps;
    }

    public void setPlannedReps(Integer plannedReps) {
        this.plannedReps = plannedReps;
    }

    public Double getPlannedWeightKg() {
        return plannedWeightKg;
    }

    public void setPlannedWeightKg(Double plannedWeightKg) {
        this.plannedWeightKg = plannedWeightKg;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
