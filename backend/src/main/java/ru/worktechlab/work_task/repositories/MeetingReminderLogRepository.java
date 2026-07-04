package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.MeetingReminderLog;

@Repository
public interface MeetingReminderLogRepository extends JpaRepository<MeetingReminderLog, String> {
    boolean existsByMeetingIdAndUserId(String meetingId, String userId);
}
