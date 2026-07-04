package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Факт отправки напоминания о встрече конкретному участнику (ТП-65).
 * Раньше был один флаг meeting.reminder_sent на всю встречу — при
 * настраиваемом времени напоминания у разных участников он не годится
 * (у кого-то окно 5 минут, у кого-то час). Логируем по паре (meeting, user),
 * чтобы не слать дубли.
 */
@Entity
@Table(name = "meeting_reminder_log",
        uniqueConstraints = @UniqueConstraint(columnNames = {"meeting_id", "user_id"}))
@Getter
@NoArgsConstructor
public class MeetingReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "meeting_id", nullable = false)
    private String meetingId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    public MeetingReminderLog(String meetingId, String userId) {
        this.meetingId = meetingId;
        this.userId = userId;
    }
}
