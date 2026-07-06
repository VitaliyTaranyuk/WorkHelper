package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.MeetRoom;

import java.util.Optional;

@Repository
public interface MeetRoomRepository extends JpaRepository<MeetRoom, String> {

    Optional<MeetRoom> findByToken(String token);

    /** Действующая комната календарной встречи (одна на встречу). */
    Optional<MeetRoom> findFirstByMeetingIdAndEndedAtIsNull(String meetingId);

    /** Действующая комната задачи (одна на задачу). */
    Optional<MeetRoom> findFirstByTaskIdAndEndedAtIsNull(String taskId);
}
