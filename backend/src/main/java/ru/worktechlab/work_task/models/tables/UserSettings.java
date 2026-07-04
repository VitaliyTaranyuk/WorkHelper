package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Серверные настройки уведомлений пользователя (ТП-65). Одна запись на
 * пользователя; отсутствие записи = значения по умолчанию (всё включено,
 * напоминание за 15 минут). Настройки читаются генераторами уведомлений
 * (InAppNotificationService) и планировщиком напоминаний о встречах.
 */
@Entity
@Table(name = "user_settings")
@Getter
@NoArgsConstructor
public class UserSettings {

    /** Дефолты — если у пользователя ещё нет записи. */
    public static final boolean DEFAULT_NOTIFY = true;
    public static final int DEFAULT_REMINDER_MINUTES = 15;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false, unique = true)
    private String userId;

    @Column(name = "notify_mentions", nullable = false)
    private boolean notifyMentions = DEFAULT_NOTIFY;

    @Column(name = "notify_task_created", nullable = false)
    private boolean notifyTaskCreated = DEFAULT_NOTIFY;

    @Column(name = "notify_meetings", nullable = false)
    private boolean notifyMeetings = DEFAULT_NOTIFY;

    /** За сколько минут до начала встречи присылать напоминание. */
    @Column(name = "reminder_minutes", nullable = false)
    private int reminderMinutes = DEFAULT_REMINDER_MINUTES;

    public UserSettings(String userId) {
        this.userId = userId;
    }

    public void setNotifyMentions(boolean notifyMentions) {
        this.notifyMentions = notifyMentions;
    }

    public void setNotifyTaskCreated(boolean notifyTaskCreated) {
        this.notifyTaskCreated = notifyTaskCreated;
    }

    public void setNotifyMeetings(boolean notifyMeetings) {
        this.notifyMeetings = notifyMeetings;
    }

    public void setReminderMinutes(int reminderMinutes) {
        this.reminderMinutes = reminderMinutes;
    }
}
