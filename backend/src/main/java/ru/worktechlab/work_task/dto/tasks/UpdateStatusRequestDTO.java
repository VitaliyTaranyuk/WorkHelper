package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.validators.ValidProjectId;
import ru.worktechlab.work_task.validators.ValidTaskId;

@NoArgsConstructor
@Getter
@Setter
public class UpdateStatusRequestDTO {

    @Schema(description = "Проект задачи", example = "id проекта")
    @NotNull(message = "Поле PROJECT_ID не может быть пустым")
    @ValidProjectId
    private String projectId;

    @Schema(description = "id задачи")
    @NotBlank(message = "Поле ID не может быть пустым")
    @ValidTaskId
    private String id;

    @Schema(description = "ИД статуса задачи", example = "123")
    private Long status;
}
