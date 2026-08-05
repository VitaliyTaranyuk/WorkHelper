package ru.worktechlab.work_task.dto.projects;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.models.enums.BoardMode;

/**
 * Режим доски проекта (T-519).
 *
 * <p>Поле обязательное, в отличие от размера задачи: снимать режим некуда — «нет режима»
 * означало бы возврат к неявному состоянию, ради устранения которого задача и делалась.
 */
@Schema(description = "Режим доски проекта (T-519)")
@Getter
@Setter
@NoArgsConstructor
public class BoardModeRequestDto {

    @Schema(description = "SPRINT — доска по активному спринту; KANBAN — спринты не используются",
            example = "KANBAN")
    @NotNull(message = "Режим доски обязателен")
    private BoardMode boardMode;
}
