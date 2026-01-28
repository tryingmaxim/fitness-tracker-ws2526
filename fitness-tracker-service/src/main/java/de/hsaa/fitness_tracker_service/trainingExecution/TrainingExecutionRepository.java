package de.hsaa.fitness_tracker_service.trainingExecution;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import de.hsaa.fitness_tracker_service.user.User;

public interface TrainingExecutionRepository extends JpaRepository<TrainingExecution, Long> {

    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    Optional<TrainingExecution> findWithExercisesById(Long id);

    // ===== Standard (nur wenn Session noch verlinkt ist) =====
    long countBySessionId(Long sessionId);
    List<TrainingExecution> findBySessionId(Long sessionId);

    // ===== Snapshot-only (wenn Session gelöscht/detached ist) =====
    long countBySessionIdSnapshot(Long sessionIdSnapshot);
    List<TrainingExecution> findBySessionIdSnapshot(Long sessionIdSnapshot);

    //Count: Session ODER Snapshot (wichtig für performedCount überall)
    @Query("""
        select count(te) from TrainingExecution te
        where (te.session.id = :id)
           or (te.session is null and te.sessionIdSnapshot = :id)
    """)
    long countBySessionOrSnapshot(@Param("id") Long id);

    //Count Session/Snapshot pro User (für performedCount pro User)
    @Query("""
        select count(te) from TrainingExecution te
        where te.user = :user
          and (
                (te.session.id = :id)
             or (te.session is null and te.sessionIdSnapshot = :id)
          )
    """)
    long countBySessionOrSnapshotAndUser(@Param("id") Long id, @Param("user") User user);

    //Liste: Session ODER Snapshot (für /training-executions?sessionId=...)
    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    @Query("""
        select te from TrainingExecution te
        where (te.session.id = :id)
           or (te.session is null and te.sessionIdSnapshot = :id)
        order by te.startedAt desc
    """)
    List<TrainingExecution> findWithExercisesBySessionOrSnapshot(@Param("id") Long id);

    //Training-Progress: alle Executions inkl. Übungen
    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    @Query("select te from TrainingExecution te")
    List<TrainingExecution> findAllWithExercises();

    //Streak (COMPLETED newest first) (global)
    List<TrainingExecution> findByStatusOrderByCompletedAtDesc(TrainingExecution.Status status);

    // ===== Counts für Listenansicht (wenn Sessions existieren) =====
    @Query("""
        select te.session.id, count(te)
        from TrainingExecution te
        where te.session.id in :ids
        group by te.session.id
    """)
    List<Object[]> countBySessionIds(@Param("ids") List<Long> ids);

    // ===== Counts für Listenansicht (wenn Sessions gelöscht/detached -> snapshot) =====
    @Query("""
        select te.sessionIdSnapshot, count(te)
        from TrainingExecution te
        where te.session is null and te.sessionIdSnapshot in :ids
        group by te.sessionIdSnapshot
    """)
    List<Object[]> countBySessionIdSnapshots(@Param("ids") List<Long> ids);

    // Optional (falls du’s irgendwo nutzt)
    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    List<TrainingExecution> findWithExercisesBySessionId(Long sessionId);

  
    // Alle Executions des Users inkl. Exercises
    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    @Query("""
        select te from TrainingExecution te
        where te.user = :user
        order by te.startedAt desc
    """)
    List<TrainingExecution> findAllWithExercisesByUser(@Param("user") User user);

    // Alle Executions eines Users für Session ODER Snapshot inkl. Exercises
    @EntityGraph(attributePaths = {
        "session",
        "executedExercises",
        "executedExercises.exercise"
    })
    @Query("""
        select te from TrainingExecution te
        where te.user = :user
          and (
                (te.session.id = :id)
             or (te.session is null and te.sessionIdSnapshot = :id)
          )
        order by te.startedAt desc
    """)
    List<TrainingExecution> findWithExercisesBySessionOrSnapshotAndUser(@Param("id") Long id, @Param("user") User user);

    // Streak nur für den User
    List<TrainingExecution> findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
            User user,
            TrainingExecution.Status status
    );

    
    @Query("""
    	    select te.session.id, count(te)
    	    from TrainingExecution te
    	    where te.user = :user
    	      and te.session.id in :ids
    	    group by te.session.id
    	""")
    	List<Object[]> countBySessionIdsAndUser(@Param("ids") List<Long> ids, @Param("user") User user);

    	@Query("""
    	    select te.sessionIdSnapshot, count(te)
    	    from TrainingExecution te
    	    where te.user = :user
    	      and te.session is null
    	      and te.sessionIdSnapshot in :ids
    	    group by te.sessionIdSnapshot
    	""")
    	List<Object[]> countBySessionIdSnapshotsAndUser(@Param("ids") List<Long> ids, @Param("user") User user);

}
