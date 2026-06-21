package ru.worktechlab.work_task.dto.task_link;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.validators.ValidLinkTypeName;
import ru.worktechlab.work_task.validators.ValidProjectId;
import ru.worktechlab.work_task.validators.ValidTaskId;

@Schema(description = "Модель связывания задач")
@Getter
@Setter
public class LinkDto {

    @Schema(description = "ID задачи")
    @NotBlank(message = "Поле taskId не может быть пустым")
    @ValidTaskId
    private String taskIdSource;

    @Schema(description = "ID задачи")
    @NotBlank(message = "Поле taskId не может быть пустым")
    @ValidTaskId
    private String taskIdTarget;

    @Schema(description = "Проект задачи")
    @NotBlank(message = "Поле PROJECT_ID не может быть пустым")
    @ValidProjectId
    private String projectId;

    @Schema(description = "LinkTypeName", example = "RELATED")
    @ValidLinkTypeName
    private String linkTypeName;
}