package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

/** Эталонный набор правил, доступный для импорта (T-513). */
@Schema(description = "Эталонный набор правил WorkHelper")
public record ReferenceSetDto(
        String id,
        String name,
        String description,
        int rulesCount
) {
}
