package ru.worktechlab.work_task.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Предохранитель расхода платного провайдера (ТП-212): не более N вызовов
 * улучшения текста на пользователя в час.
 *
 * Мотив — не защита от злоумышленника (эндпоинт и так только для
 * авторизованных), а страховка от цикла в клиенте или залипшей кнопки,
 * которые молча потратят деньги провайдера. Превышение НЕ является ошибкой
 * для пользователя: сервис честно отдаёт исходный текст (фолбэк), как и при
 * недоступности DeepSeek.
 *
 * Реализация in-memory и попроцессная — бэкенд разворачивается одним
 * экземпляром (docker-compose.vds.yml); распределённый лимит потребовал бы
 * общего хранилища, что для страховочного механизма избыточно.
 */
@Component
public class VoiceEnhancementRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    @Value("${app.deepseek.rate-limit-per-hour:60}")
    private int limitPerHour;

    private record Window(long startedAtMs, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** true — вызов разрешён (и учтён); false — лимит исчерпан. */
    public boolean tryAcquire(String userId) {
        return tryAcquire(userId, System.currentTimeMillis());
    }

    /** Тестируемый вариант с явным временем. */
    boolean tryAcquire(String userId, long nowMs) {
        if (limitPerHour <= 0) return true;
        Window updated = windows.compute(userId, (key, current) -> {
            if (current == null || nowMs - current.startedAtMs() >= WINDOW.toMillis()) {
                return new Window(nowMs, 1);
            }
            return new Window(current.startedAtMs(), current.count() + 1);
        });
        return updated.count() <= limitPerHour;
    }

    void setLimitPerHour(int limitPerHour) {
        this.limitPerHour = limitPerHour;
    }
}
