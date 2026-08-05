package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

/** Этап процесса задачи (T-515). */
@Schema(description = "Этап процесса задачи")
public record ProcessStepDto(
        String id,
        String code,
        String name,
        String description,
        int position
) {
}
