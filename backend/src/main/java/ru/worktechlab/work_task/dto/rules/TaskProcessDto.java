package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Процесс конкретной задачи (T-516): её размер, текущий этап и список этапов проекта с
 * отметкой обязательности **для этого размера**.
 *
 * <p>Обязательность считается на сервере, а не на клиенте: правило «этап обязателен с
 * размера X» принадлежит проекту, и два его вычисления неизбежно разошлись бы.
 */
@Schema(description = "Процесс задачи: размер, текущий этап и этапы проекта")
public record TaskProcessDto(
        String taskId,
        String size,
        String currentStepId,
        List<TaskProcessStepDto> steps
) {

    @Schema(description = "Этап процесса в контексте задачи")
    public record TaskProcessStepDto(
            String id,
            String code,
            String name,
            String description,
            int position,
            String requiredFromSize,
            boolean required,
            boolean current
    ) {
    }
}
