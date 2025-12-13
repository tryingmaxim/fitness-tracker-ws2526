package de.hsaa.fitness_tracker_service.trainingExecution;

import de.hsaa.fitness_tracker_service.trainingsSession.TrainingSession;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "training_executions")
public class TrainingExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = true)
    @JoinColumn(name = "session_id", nullable = true)
    private TrainingSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "trainingExecution", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ExecutedExercise> executedExercises = new ArrayList<>();

    public enum Status {
        IN_PROGRESS,
        COMPLETED
    }

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

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public List<ExecutedExercise> getExecutedExercises() {
        return executedExercises;
    }

    public void setExecutedExercises(List<ExecutedExercise> executedExercises) {
        this.executedExercises = executedExercises;
    }
}
