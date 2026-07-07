package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.monitoring.MonitoringWebhookDto;
import ru.worktechlab.work_task.exceptions.PermissionDeniedException;
import ru.worktechlab.work_task.models.tables.Notification;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.NotificationRepository;
import ru.worktechlab.work_task.repositories.ProjectRepository;

import java.util.List;

/**
 * Алерты прод-мониторинга клиентских ошибок (ТП-175): GlitchTip шлёт вебхук
 * при всплеске/новом типе ошибки → участники продуктового проекта получают
 * уведомление в колокольчик со ссылкой на issue. Алерты живут в самом
 * WorkTask — отдельный канал (почта/мессенджер) не требуется.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MonitoringAlertService {

    public static final String TYPE_MONITORING_ALERT = "MONITORING_ALERT";
    /** Message-колонка уведомления ограничена 1024 — заголовок issue режем с запасом. */
    private static final int MAX_MESSAGE_LENGTH = 512;

    private final NotificationRepository notificationRepository;
    private final ProjectRepository projectRepository;

    /**
     * Общий секрет вебхука: сравнивается с query-параметром запроса.
     * Пустое значение = приём выключен (безопасный дефолт: endpoint
     * недоступен, пока пайплайн не сгенерирует секрет).
     */
    @Value("${app.monitoring.webhook-token:}")
    private String webhookToken;

    /** Проект, участники которого получают алерты (продуктовая команда). */
    @Value("${app.monitoring.project-id:}")
    private String projectId;

    @TransactionRequired
    public ApiResponse acceptAlert(String token, MonitoringWebhookDto payload) throws PermissionDeniedException {
        if (webhookToken == null || webhookToken.isBlank()
                || token == null || !constantTimeEquals(webhookToken, token)) {
            throw new PermissionDeniedException("Неверный токен вебхука мониторинга");
        }
        if (projectId == null || projectId.isBlank()) {
            log.warn("MONITORING_ALERT получен, но app.monitoring.project-id не настроен — получателей нет");
            return new ApiResponse("Получатели алертов не настроены");
        }
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            log.warn("MONITORING_ALERT: проект {} не найден — уведомления не созданы", projectId);
            return new ApiResponse("Проект получателей не найден");
        }

        String message = buildMessage(payload);
        String link = extractLink(payload);
        List<User> recipients = project.getUsers();
        for (User recipient : recipients) {
            Notification notification = new Notification(
                    recipient, null, TYPE_MONITORING_ALERT, message, null, null, null);
            notification.attachExternalLink(link);
            notificationRepository.save(notification);
        }
        notificationRepository.flush();
        log.info("MONITORING_ALERT доставлен {} получателям (link={})", recipients.size(), link);
        return new ApiResponse("Алерт доставлен: " + recipients.size());
    }

    /** Заголовок первого attachment (тип и текст ошибки), иначе общий text. */
    private String buildMessage(MonitoringWebhookDto payload) {
        String base = null;
        if (payload != null && payload.getAttachments() != null && !payload.getAttachments().isEmpty()) {
            MonitoringWebhookDto.Attachment first = payload.getAttachments().get(0);
            base = first.getTitle() != null && !first.getTitle().isBlank() ? first.getTitle() : first.getText();
        }
        if (base == null || base.isBlank())
            base = payload != null && payload.getText() != null && !payload.getText().isBlank()
                    ? payload.getText() : "Новая ошибка в клиентском приложении";
        return base.length() > MAX_MESSAGE_LENGTH ? base.substring(0, MAX_MESSAGE_LENGTH - 1) + "…" : base;
    }

    private String extractLink(MonitoringWebhookDto payload) {
        if (payload == null || payload.getAttachments() == null) return null;
        return payload.getAttachments().stream()
                .map(MonitoringWebhookDto.Attachment::getTitleLink)
                .filter(l -> l != null && !l.isBlank())
                .findFirst()
                .orElse(null);
    }

    /** Сравнение без утечки длины/позиции расхождения по таймингу. */
    private boolean constantTimeEquals(String expected, String actual) {
        byte[] a = expected.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] b = actual.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(a, b);
    }
}
