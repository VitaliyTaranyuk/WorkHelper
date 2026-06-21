package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class ActivateSprintDtoRequest {
    @NotNull
    @Schema(description = "Запуск/завершение спринта")
    private boolean activate;
}
