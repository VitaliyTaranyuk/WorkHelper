package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.MeetingReminderLog;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UserSettings;
import ru.worktechlab.work_task.repositories.MeetingReminderLogRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Раз в минуту рассылает участникам встречи in-app напоминание. Время
 * напоминания настраивается per-user (ТП-65): планировщик сканирует встречи в
 * широком окне и для каждого участника проверяет его настройки
 * (notifyMeetings + reminderMinutes) и журнал уже отправленных напоминаний
 * (meeting_reminder_log), чтобы не слать дубли. Без email/push — только in-app.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MeetingReminderScheduler {

    public static final String TYPE_MEETING_REMINDER = "MEETING_REMINDER";
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    // Верхняя граница окна сканирования = максимум настройки reminderMinutes.
    private static final long MAX_REMINDER_MINUTES = 1440;

    private final MeetingRepository meetingRepository;
    private final NotificationRepository notificationRepository;
    private final MeetingReminderLogRepository reminderLogRepository;
    private final UserSettingsService userSettingsService;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime upperBound = now.plusMinutes(MAX_REMINDER_MINUTES);
        List<Meeting> upcoming = meetingRepository.findUpcoming(now, upperBound);
        if (upcoming.isEmpty()) return;

        int notified = 0;
        for (Meeting meeting : upcoming) {
            long minutesUntilStart = Duration.between(now, meeting.getStartAt()).toMinutes();
            // ТП-72: тип («Напоминание о встрече») показывает заголовок строки —
            // в тексте не повторяем слово «Встреча», оставляем название и время.
            String message = String.format("«%s» начнётся в %s",
                    meeting.getTitle(), meeting.getStartAt().format(TIME));
            for (User participant : meeting.getParticipants()) {
                UserSettings settings = userSettingsService.effectiveFor(participant.getId());
                if (!settings.isNotifyMeetings()) continue;
                // Ещё рано — встреча вне окна напоминания этого участника
                if (minutesUntilStart > settings.getReminderMinutes()) continue;
                // Уже присылали этому участнику по этой встрече
                if (reminderLogRepository.existsByMeetingIdAndUserId(meeting.getId(), participant.getId()))
                    continue;
                notificationRepository.save(Notification.meetingReminder(
                        participant, meeting.getCreator(), TYPE_MEETING_REMINDER, message,
                        meeting.getId(), meeting.getProject().getId(), meeting.getLink()));
                reminderLogRepository.save(new MeetingReminderLog(meeting.getId(), participant.getId()));
                notified++;
            }
        }
        if (notified > 0) {
            notificationRepository.flush();
            reminderLogRepository.flush();
            log.info("Напоминания о встречах: отправлено {} уведомлений", notified);
        }
    }
}
