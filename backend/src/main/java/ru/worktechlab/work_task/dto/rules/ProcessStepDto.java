package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Этап процесса задачи (T-515).
 *
 * <p>{@code requiredFromSize} (T-516) — с какого размера задачи этап обязателен;
 * {@code null} означает «необязателен ни при каком». Значение отдаётся строкой: фронтенд
 * обязан деградировать к показу самого значения на незнакомом имени (**W-08**).
 */
@Schema(description = "Этап процесса задачи")
public record ProcessStepDto(
        String id,
        String code,
        String name,
        String description,
        int position,
        String requiredFromSize
) {
}
