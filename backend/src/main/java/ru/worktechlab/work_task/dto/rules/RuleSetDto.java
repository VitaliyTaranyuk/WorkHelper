package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Набор правил (T-511).
 *
 * <p>{@code projectId} = {@code null} означает набор уровня пользователя
 * («общие правила»). Отдельного поля «уровень» нет намеренно: два поля об одном
 * разошлись бы (урок T-106).
 */
@Schema(description = "Набор правил")
public record RuleSetDto(
        String id,
        String projectId,
        String name,
        String description,
        int version,
        long rulesCount,
        LocalDateTime createdAt
) {
}
