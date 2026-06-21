package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import ru.worktechlab.work_task.validators.*;

@Schema(description = "Модель создания задачи")
@Data
public class TaskModelDTO {

    @Schema(description = "Заголовок", example = "Создание задачи")
    @NotBlank(message = "Поле TITLE не может быть пустым")
    @Size(max = 255, message = "Длина поля TITLE не может быть более 255 символов")
    private String title;

    @Schema(description = "Описание", example = "Создать задачу для Яна")
    @Size(max = 4096, message = "Длина поля DESCRIPTION не может быть более 4096 символов")
    private String description;

    @Schema(description = "Приоритет", example = "MEDIUM")
    @NotBlank(message = "Поле PRIORITY не может быть пустым")
    @ValidPriority
    private String priority;

    @Schema(description = "Исполнитель задачи", example = "id пользователя")
    @ValidAssignee
    @NotBlank(message = "ASSIGNEE не может быть пустым")
    private String assignee;

    @Schema(description = "Проект задачи", example = "id проекта")
    @NotNull(message = "Поле PROJECT_ID не может быть пустым")
    @ValidProjectId
    private String projectId;

    @Schema(description = "Спринт", example = "id спринта")
    private String sprintId;

    @Schema(description = "Тип задачи", example = "TASK")
    @NotBlank(message = "Поле TASK_TYPE не может быть пустым")
    @ValidTaskType
    private String taskType;

    @Schema(description = "Оценка задачи", example = "3")
    @Min(value = 0, message = "ESTIMATION должен быть не меньше 0")
    @Max(value = 999, message = "ESTIMATION должен быть меньше 1000")
    private Integer estimation;
}
