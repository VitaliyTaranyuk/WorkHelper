package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Раз в минуту отправляет участникам встречи уведомление в колокольчик
 * за 15 минут до начала. Без email/push/realtime — только in-app.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MeetingReminderScheduler {

    public static final String TYPE_MEETING_REMINDER = "MEETING_REMINDER";
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final MeetingRepository meetingRepository;
    private final NotificationRepository notificationRepository;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime in15 = now.plusMinutes(15);
        List<Meeting> due = meetingRepository.findDueReminders(now, in15);
        if (due.isEmpty()) return;

        int notified = 0;
        for (Meeting meeting : due) {
            String message = String.format("Встреча «%s» начнётся в %s",
                    meeting.getTitle(), meeting.getStartAt().format(TIME));
            for (User participant : meeting.getParticipants()) {
                notificationRepository.save(Notification.meetingReminder(
                        participant, meeting.getCreator(), TYPE_MEETING_REMINDER, message,
                        meeting.getId(), meeting.getProject().getId(), meeting.getLink()));
                notified++;
            }
            meeting.setReminderSent(true);
        }
        notificationRepository.flush();
        meetingRepository.flush();
        log.info("Напоминания о встречах: {} встреч, {} уведомлений", due.size(), notified);
    }
}
