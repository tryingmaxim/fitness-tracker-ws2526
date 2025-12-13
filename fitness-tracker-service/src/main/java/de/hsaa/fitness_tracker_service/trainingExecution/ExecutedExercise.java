package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.exercise.Exercise;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(
    name = "executed_exercises",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = { "training_execution_id", "exercise_id" })
    }
)
public class ExecutedExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "training_execution_id", nullable = false)
    private TrainingExecution trainingExecution;

    @ManyToOne(optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @NotNull
    @Min(1)
    @Column(name = "planned_sets", nullable = false)
    private Integer plannedSets;

    @NotNull
    @Min(1)
    @Column(name = "planned_reps", nullable = false)
    private Integer plannedReps;

    @NotNull
    @Min(0)
    @Column(name = "planned_weight_kg", nullable = false)
    private Double plannedWeightKg;

    @NotNull
    @Min(0)
    @Column(name = "actual_sets", nullable = false)
    private Integer actualSets;

    @NotNull
    @Min(0)
    @Column(name = "actual_reps", nullable = false)
    private Integer actualReps;

    @NotNull
    @Min(0)
    @Column(name = "actual_weight_kg", nullable = false)
    private Double actualWeightKg;

    @Column(nullable = false)
    private boolean done;

    @Column(length = 1000)
    private String notes;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TrainingExecution getTrainingExecution() {
        return trainingExecution;
    }

    public void setTrainingExecution(TrainingExecution trainingExecution) {
        this.trainingExecution = trainingExecution;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
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

    public Integer getActualSets() {
        return actualSets;
    }

    public void setActualSets(Integer actualSets) {
        this.actualSets = actualSets;
    }

    public Integer getActualReps() {
        return actualReps;
    }

    public void setActualReps(Integer actualReps) {
        this.actualReps = actualReps;
    }

    public Double getActualWeightKg() {
        return actualWeightKg;
    }

    public void setActualWeightKg(Double actualWeightKg) {
        this.actualWeightKg = actualWeightKg;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
