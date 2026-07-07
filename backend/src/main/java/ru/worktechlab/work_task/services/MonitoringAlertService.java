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
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Алерты прод-мониторинга клиентских ошибок (ТП-175, доработка ТП-193):
 * GlitchTip шлёт вебхук при всплеске/новом типе ошибки → участники
 * продуктового проекта получают уведомление в колокольчик со ссылкой на
 * issue. ТП-193: дедупликация повторов, фильтр тест/аудит-шума, контекст
 * (тип ошибки + место) в тексте — уведомление полезно без клика.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MonitoringAlertService {

    public static final String TYPE_MONITORING_ALERT = "MONITORING_ALERT";
    /** Message-колонка уведомления ограничена 1024 — заголовок issue режем с запасом. */
    private static final int MAX_MESSAGE_LENGTH = 512;
    /** ТП-193: тот же issue не ре-нотифицирует чаще, чем раз в 10 минут (анти-спам). */
    private static final long DEDUP_INTERVAL_MS = 10 * 60 * 1000;
    /**
     * ТП-193: наши собственные тест/аудит-события (смоук деплоя, e2e-аудит)
     * не должны шуметь в колокольчике реальной команды.
     */
    private static final String[] NOISE_MARKERS = {
            "deploy smoke", "smoke тп", "аудит тп", "audit", "тестовая клиентская ошибка", "probe"
    };

    private final NotificationRepository notificationRepository;
    private final ProjectRepository projectRepository;

    /** Эфемерный журнал отправок (dedup-ключ → millis) — как в MeetNotificationService (ADR-013). */
    private final Map<String, Long> lastSentAt = new ConcurrentHashMap<>();

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

        // ТП-193: наш собственный тест/аудит-шум (смоук деплоя, e2e) не
        // доставляем реальной команде.
        if (isNoise(message)) {
            log.debug("MONITORING_ALERT отфильтрован как тест/аудит-шум: {}", message);
            return new ApiResponse("Алерт отфильтрован (тест/аудит)");
        }

        // ТП-193: дедуп повторов того же issue в окне — по ссылке (стабильный
        // ключ issue), при её отсутствии по тексту.
        String dedupKey = link != null && !link.isBlank() ? link : message;
        long now = System.currentTimeMillis();
        Long previous = lastSentAt.get(dedupKey);
        if (previous != null && now - previous < DEDUP_INTERVAL_MS) {
            log.debug("MONITORING_ALERT дедуп (повтор в окне): {}", dedupKey);
            return new ApiResponse("Алерт дедуплицирован");
        }
        lastSentAt.put(dedupKey, now);

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

    /**
     * ТП-193: контекст в тексте — тип/сообщение ошибки И место (culprit), чтобы
     * уведомление было полезно без клика (клик по GlitchTip требует отдельного
     * входа). Формат: «<заголовок issue> · <culprit>».
     */
    private String buildMessage(MonitoringWebhookDto payload) {
        String title = null;
        String culprit = null;
        if (payload != null && payload.getAttachments() != null && !payload.getAttachments().isEmpty()) {
            MonitoringWebhookDto.Attachment first = payload.getAttachments().get(0);
            title = blankToNull(first.getTitle());
            culprit = blankToNull(first.getText());
        }
        String base = title != null ? title
                : (payload != null ? blankToNull(payload.getText()) : null);
        if (base == null)
            base = "Новая ошибка в клиентском приложении";
        // culprit добавляем, только если он не дублирует заголовок
        if (culprit != null && !base.toLowerCase(Locale.ROOT).contains(culprit.toLowerCase(Locale.ROOT)))
            base = base + " · " + culprit;
        return base.length() > MAX_MESSAGE_LENGTH ? base.substring(0, MAX_MESSAGE_LENGTH - 1) + "…" : base;
    }

    private boolean isNoise(String message) {
        String lower = message.toLowerCase(Locale.ROOT);
        for (String marker : NOISE_MARKERS)
            if (lower.contains(marker)) return true;
        return false;
    }

    private String blankToNull(String s) {
        return s != null && !s.isBlank() ? s : null;
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
