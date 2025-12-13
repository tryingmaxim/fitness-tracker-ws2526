package de.hsaa.fitness_tracker_service.trainingsSession;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import de.hsaa.fitness_tracker_service.trainingsPlan.TrainingPlan;
import de.hsaa.fitness_tracker_service.execution.ExerciseExecution;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "training_sessions",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = { "plan_id", "order_in_plan" })
    }
)
public class TrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    @JsonBackReference
    private TrainingPlan plan;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotNull
    @Min(1)
    @Max(30)
    @Column(name = "order_in_plan", nullable = false)
    private Integer orderInPlan;

    @OrderBy("orderIndex ASC")
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference("session-executions")
    private List<ExerciseExecution> exerciseExecutions = new ArrayList<>();

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

    public Integer getOrderInPlan() {
        return orderInPlan;
    }

    public void setOrderInPlan(Integer orderInPlan) {
        this.orderInPlan = orderInPlan;
    }

    public List<ExerciseExecution> getExerciseExecutions() {
        return exerciseExecutions;
    }

    public void setExerciseExecutions(List<ExerciseExecution> exerciseExecutions) {
        this.exerciseExecutions = exerciseExecutions;
    }
}
