package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.Meeting;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, String> {

    List<Meeting> findByProjectIdOrderByStartAtAsc(String projectId);

    @Query("select distinct m from Meeting m left join fetch m.participants " +
            "where m.reminderSent = false and m.startAt between :from and :to")
    List<Meeting> findDueReminders(@Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to);

    /**
     * Предстоящие встречи в окне [from, to] (ТП-65): за окно берётся максимально
     * возможное время напоминания среди пользователей. Решение «слать ли уже» —
     * по индивидуальным настройкам получателя в планировщике.
     */
    @Query("select distinct m from Meeting m left join fetch m.participants " +
            "where m.startAt between :from and :to")
    List<Meeting> findUpcoming(@Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to);
}
