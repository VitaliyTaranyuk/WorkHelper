package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Сгенерированный `AGENTS.md` проекта (T-514).
 *
 * <p>Отдаётся содержимым, а не файлом: пользователю нужно и посмотреть текст перед тем,
 * как класть его в репозиторий, и скопировать, и скачать — из строки доступно всё три,
 * из потока байт только последнее.
 */
@Schema(description = "Сгенерированный AGENTS.md проекта")
public record AgentsFileDto(
        String fileName,
        String content,
        int rulesCount,
        LocalDateTime generatedAt
) {
}
