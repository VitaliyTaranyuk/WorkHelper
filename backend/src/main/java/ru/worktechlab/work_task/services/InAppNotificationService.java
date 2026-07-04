package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.notifications.NotificationDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.NotificationRepository;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * In-app notifications for @mentions. MVP: list + unread count + mark read.
 * No email / push / realtime (email lives in the separate NotificationService).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class InAppNotificationService {

    public static final String TYPE_MENTION = "MENTION";
    public static final String TYPE_TASK_CREATED = "TASK_CREATED";
    // Username допускает Unicode-буквы/цифры + . _ - длиной 2..32 (нижняя
    // граница 2 — как в политике username: префиксы email вроде "vt"), чтобы
    // распознавать упоминания вроде @виталий или @maria.k наряду с @ivanov.
    private static final Pattern MENTION = Pattern.compile("@([\\p{L}\\p{N}._-]{2,32})");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserContext userContext;
    private final UserSettingsService userSettingsService;

    /** Parse @username tokens in text and create a MENTION notification per mentioned user (not self). */
    @TransactionMandatory
    public void createMentionNotifications(String text, User actor, TaskModel task, String commentId) {
        if (text == null || text.isBlank()) return;
        Set<String> usernames = extractUsernames(text);
        if (usernames.isEmpty()) return;
        for (String username : usernames) {
            userRepository.findByUsername(username).ifPresent(recipient -> {
                if (recipient.getId().equals(actor.getId())) return;
                // ТП-65: получатель мог отключить уведомления об упоминаниях
                if (!userSettingsService.effectiveFor(recipient.getId()).isNotifyMentions()) return;
                // ТП-72: сообщение — только содержание события; тип («Упоминание»)
                // и код задачи фронтенд показывает из структурных полей (type,
                // taskCode) в заголовке строки. Дублировать их в тексте не нужно.
                String message = String.format("%s упомянул(а) вас", actorName(actor));
                notificationRepository.save(new Notification(recipient, actor, TYPE_MENTION, message, task.getId(), task.getCode(), commentId));
                log.debug("MENTION notification: {} -> {} (task {})", actor.getId(), recipient.getId(), task.getCode());
            });
        }
        notificationRepository.flush();
    }

    /**
     * Уведомление создателю о создании задачи (ТП-36): колокольчик показывает
     * запись с кликабельной ссылкой на карточку (переход по taskCode).
     */
    @TransactionMandatory
    public void createTaskCreatedNotification(User creator, TaskModel task) {
        // ТП-65: создатель мог отключить уведомления о создании задач
        if (!userSettingsService.effectiveFor(creator.getId()).isNotifyTaskCreated()) return;
        // ТП-72: тип («Задача создана») и код задачи фронтенд рендерит из
        // структурных полей в заголовке — в тексте оставляем только название,
        // чтобы информация не дублировалась.
        String message = task.getTitle();
        notificationRepository.save(new Notification(creator, creator, TYPE_TASK_CREATED, message,
                task.getId(), task.getCode(), null));
        notificationRepository.flush();
        log.debug("TASK_CREATED notification for creator {} (task {})", creator.getId(), task.getCode());
    }

    @TransactionRequired
    public List<NotificationDto> getMyNotifications() {
        String userId = userContext.getUserData().getUserId();
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @TransactionRequired
    public long getUnreadCount() {
        return notificationRepository.countByRecipientIdAndReadFalse(userContext.getUserData().getUserId());
    }

    @TransactionRequired
    public ApiResponse markRead(String notificationId) throws NotFoundException {
        String userId = userContext.getUserData().getUserId();
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new NotFoundException(String.format("Уведомление %s не найдено", notificationId)));
        notification.markRead();
        notificationRepository.flush();
        return new ApiResponse("Уведомление отмечено прочитанным");
    }

    @TransactionRequired
    public ApiResponse markAllRead() {
        notificationRepository.markAllRead(userContext.getUserData().getUserId());
        notificationRepository.flush();
        return new ApiResponse("Все уведомления отмечены прочитанными");
    }

    private Set<String> extractUsernames(String text) {
        Set<String> usernames = new HashSet<>();
        Matcher matcher = MENTION.matcher(text);
        while (matcher.find())
            usernames.add(matcher.group(1).toLowerCase());
        return usernames;
    }

    private String actorName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank())
            return user.getDisplayName();
        return String.format("%s %s", user.getFirstName(), user.getLastName());
    }

    private NotificationDto toDto(Notification n) {
        String actorUsername = n.getActor() != null ? n.getActor().getUsername() : null;
        return new NotificationDto(n.getId(), n.getType(), n.getMessage(), n.getTaskId(), n.getTaskCode(),
                n.getCommentId(), n.getMeetingId(), n.getProjectId(), n.getLink(),
                actorUsername, n.isRead(), n.getCreatedAt());
    }
}
