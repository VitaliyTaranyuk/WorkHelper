package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.NotificationRepository;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Уведомление «встреча началась» (M5, ТП-165): первый вошедший в комнату
 * календарной встречи триггерит in-app уведомление её участникам — опоздавшие
 * видят живую ссылку в колокольчике. Переиспользует механизм напоминаний
 * (Notification.meetingReminder: meetingId/projectId/link уже есть).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeetNotificationService {

    public static final String TYPE_MEETING_STARTED = "MEETING_STARTED";
    /** Повторный «старт» той же встречи не раньше, чем через 10 минут (анти-спам). */
    private static final long RESEND_INTERVAL_MS = 10 * 60 * 1000;

    private final MeetRoomRepository meetRoomRepository;
    private final MeetingRepository meetingRepository;
    private final NotificationRepository notificationRepository;
    private final UserSettingsService userSettingsService;

    /** Эфемерный журнал отправок (meetingId → millis): комнатное состояние и так in-memory (ADR-013). */
    private final Map<String, Long> lastSentAt = new ConcurrentHashMap<>();

    /**
     * Вызывается сигналингом, когда участник вошёл в ПУСТУЮ комнату. Ошибки
     * не пробрасываются — уведомление не должно ломать вход в звонок.
     */
    @TransactionRequired
    public void notifyMeetingStarted(String roomToken, String joinedUserId) {
        try {
            MeetRoom room = meetRoomRepository.findByToken(roomToken).orElse(null);
            if (room == null || room.getMeetingId() == null)
                return; // быстрая встреча без записи в календаре — некому рассылать
            Meeting meeting = meetingRepository.findById(room.getMeetingId()).orElse(null);
            if (meeting == null)
                return;

            long now = System.currentTimeMillis();
            Long previous = lastSentAt.get(room.getMeetingId());
            if (previous != null && now - previous < RESEND_INTERVAL_MS)
                return;
            lastSentAt.put(room.getMeetingId(), now);

            String link = meeting.getLink();
            int notified = 0;
            for (User participant : meeting.getParticipants()) {
                if (Objects.equals(participant.getId(), joinedUserId))
                    continue; // вошедший и так на встрече
                // Та же настройка, что у напоминаний: участник мог отключить их
                if (!userSettingsService.effectiveFor(participant.getId()).isNotifyMeetings())
                    continue;
                String message = String.format("«%s» уже идёт — присоединяйтесь", meeting.getTitle());
                notificationRepository.save(Notification.meetingReminder(
                        participant, meeting.getCreator(), TYPE_MEETING_STARTED, message,
                        room.getMeetingId(), meeting.getProject().getId(), link));
                notified++;
            }
            if (notified > 0) {
                notificationRepository.flush();
                log.info("Meet: MEETING_STARTED по встрече {} — {} уведомлений",
                        room.getMeetingId(), notified);
            }
        } catch (Exception e) {
            log.warn("Meet: не удалось разослать MEETING_STARTED ({})", e.getMessage());
        }
    }
}
