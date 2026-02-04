package de.hsaa.fitness_tracker_service.trainingExecution;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import de.hsaa.fitness_tracker_service.user.User;

public interface TrainingExecutionRepository extends JpaRepository<TrainingExecution, Long> {

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
	Optional<TrainingExecution> findWithExercisesById(Long id);

	long countBySessionId(Long sessionId);

	List<TrainingExecution> findBySessionId(Long sessionId);

	long countBySessionIdSnapshot(Long sessionIdSnapshot);

	List<TrainingExecution> findBySessionIdSnapshot(Long sessionIdSnapshot);

	@Query("""
			    select count(te) from TrainingExecution te
			    where (te.session.id = :id)
			       or (te.session is null and te.sessionIdSnapshot = :id)
			""")
	long countBySessionOrSnapshot(@Param("id") Long id);

	@Query("""
			    select count(te) from TrainingExecution te
			    where te.user = :user
			      and (
			            (te.session.id = :id)
			         or (te.session is null and te.sessionIdSnapshot = :id)
			      )
			""")
	long countBySessionOrSnapshotAndUser(@Param("id") Long id, @Param("user") User user);

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
	@Query("""
			    select te from TrainingExecution te
			    where (te.session.id = :id)
			       or (te.session is null and te.sessionIdSnapshot = :id)
			    order by te.startedAt desc
			""")
	List<TrainingExecution> findWithExercisesBySessionOrSnapshot(@Param("id") Long id);

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
	@Query("select te from TrainingExecution te")
	List<TrainingExecution> findAllWithExercises();

	List<TrainingExecution> findByStatusOrderByCompletedAtDesc(TrainingExecution.Status status);

	@Query("""
			    select te.session.id, count(te)
			    from TrainingExecution te
			    where te.session.id in :ids
			    group by te.session.id
			""")
	List<Object[]> countBySessionIds(@Param("ids") List<Long> ids);

	@Query("""
			    select te.sessionIdSnapshot, count(te)
			    from TrainingExecution te
			    where te.session is null and te.sessionIdSnapshot in :ids
			    group by te.sessionIdSnapshot
			""")
	List<Object[]> countBySessionIdSnapshots(@Param("ids") List<Long> ids);

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
	List<TrainingExecution> findWithExercisesBySessionId(Long sessionId);

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
	@Query("""
			    select te from TrainingExecution te
			    where te.user = :user
			    order by te.startedAt desc
			""")
	List<TrainingExecution> findAllWithExercisesByUser(@Param("user") User user);

	@EntityGraph(attributePaths = { "session", "executedExercises", "executedExercises.exercise" })
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

	List<TrainingExecution> findByUserAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(User user,
			TrainingExecution.Status status);

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
