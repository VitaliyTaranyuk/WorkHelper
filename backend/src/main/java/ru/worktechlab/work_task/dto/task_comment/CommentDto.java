package ru.worktechlab.work_task.dto.task_comment;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.validators.ValidProjectId;
import ru.worktechlab.work_task.validators.ValidTaskId;

@Schema(description = "Модель создания комментария")
@Getter
@Setter
public class CommentDto {

    @Schema(description = "ID задачи")
    @NotBlank(message = "Поле taskId не может быть пустым")
    @ValidTaskId
    private String taskId;

    @Schema(description = "Проект задачи")
    @NotBlank(message = "Поле PROJECT_ID не может быть пустым")
    @ValidProjectId
    private String projectId;

    @Schema(description = "Комментарий")
    @NotBlank(message = "COMMENT не может быть пустым")
    @Size(max = 4096, message = "Длина поля COMMENT не может быть более 4096 символов")
    private String comment;
}
