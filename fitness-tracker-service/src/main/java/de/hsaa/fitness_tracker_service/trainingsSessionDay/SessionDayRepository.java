package de.hsaa.fitness_tracker_service.trainingsSessionDay;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionDayRepository extends JpaRepository<SessionDay, Long> {

	@Query("""
			  select (count(sd) > 0)
			  from SessionDay sd
			  where sd.session.plan.id = :planId
			    and sd.day = :day
			""")
	boolean existsByPlanIdAndDay(@Param("planId") Long planId, @Param("day") Integer day);

	@Query("""
			  select (count(sd) > 0)
			  from SessionDay sd
			  where sd.session.plan.id = :planId
			    and sd.day = :day
			    and sd.session.id <> :sessionId
			""")
	boolean existsByPlanIdAndDayAndSessionIdNot(@Param("planId") Long planId, @Param("day") Integer day,
			@Param("sessionId") Long sessionId);
}
