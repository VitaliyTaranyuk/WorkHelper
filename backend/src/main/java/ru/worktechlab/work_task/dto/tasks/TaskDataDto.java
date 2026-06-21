package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.dto.statuses.TaskStatusShortDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.validators.*;

@NoArgsConstructor
@Getter
@Setter
public class TaskDataDto {
    @Schema(description = "id задачи")
    @NotBlank(message = "Поле ID не может быть пустым")
    @ValidTaskId
    private String id;

    @Schema(description = "Заголовок", example = "Создание задачи")
    @NotBlank(message = "Поле TITLE не может быть пустым")
    @Size(max = 255, message = "Длина поля TITLE не может быть более 255 символов")
    private String title;

    @Schema(description = "Описание", example = "Создать задачу для Яна")
    @ValidDescription
    private String description;

    @Schema(description = "Приоритет", example = "MEDIUM")
    @NotBlank(message = "Поле PRIORITY не может быть пустым")
    @ValidPriority
    private String priority;

    @Schema(description = "Исполнитель задачи")
    private UserShortDataDto assignee;

    @Schema(description = "Создатель задачи")
    private UserShortDataDto creator;

    @Schema(description = "Проект задачи", example = "id проекта")
    @NotNull(message = "Поле PROJECT_ID не может быть пустым")
    @ValidProjectId
    private String projectId;

    @Schema(description = "ИД спринта")
    @ValidSprintId
    private String sprintId;

    @Schema(description = "Тип задачи", example = "TASK")
    @NotBlank(message = "Поле TASK_TYPE не может быть пустым")
    @ValidTaskType
    private String taskType;

    @Schema(description = "Статус задачи")
    private TaskStatusShortDto status;

    @Schema(description = "Оценка задачи", example = "3")
    @ValidEstimation
    private Integer estimation;

    @Schema(description = "Код задачи", example = "ТП-1")
    private String code;
}
