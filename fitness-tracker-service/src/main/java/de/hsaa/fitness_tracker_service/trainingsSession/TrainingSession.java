package de.hsaa.fitness_tracker_service.trainingsSession;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.trainingsSessionDay.SessionDay;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "training_sessions")
public class TrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @JsonBackReference
    private TrainingPlan plan;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @OrderBy("day ASC")
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private Set<SessionDay> days = new LinkedHashSet<>();

    @OrderBy("orderIndex ASC")
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference("session-executions")
    private Set<ExerciseExecution> exerciseExecutions = new LinkedHashSet<>();

    public Long getId() {
        return id;
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

    public Set<SessionDay> getDays() {
        return days;
    }

    public void setDays(Set<SessionDay> days) {
        this.days.clear();
        if (days != null) {
            for (SessionDay d : days) {
                d.setSession(this);
            }
            this.days.addAll(days);
        }
    }

    public Set<ExerciseExecution> getExerciseExecutions() {
        return exerciseExecutions;
    }

    public void setExerciseExecutions(Set<ExerciseExecution> exerciseExecutions) {
        this.exerciseExecutions.clear();
        if (exerciseExecutions != null) {
            for (ExerciseExecution e : exerciseExecutions) {
                e.setSession(this);
            }
            this.exerciseExecutions.addAll(exerciseExecutions);
        }
    }
}
