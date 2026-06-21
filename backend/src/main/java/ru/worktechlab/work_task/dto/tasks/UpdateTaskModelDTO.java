package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.validators.*;

@NoArgsConstructor
@Getter
@Setter
public class UpdateTaskModelDTO {

    @Schema(description = "Заголовок", example = "Создание задачи")
    @NotBlank(message = "Поле TITLE не может быть пустым")
    @Size(max = 255, message = "Длина поля TITLE не может быть более 255 символов")
    private String title;

    @Schema(description = "Описание", example = "Создать задачу для Яна")
    @ValidDescription
    private String description;

    @Schema(description = "Приоритет", example = "MINOR")
    @NotBlank(message = "Поле PRIORITY не может быть пустым")
    @ValidPriority
    private String priority;

    @Schema(description = "Исполнитель задачи", example = "id пользователя")
    @ValidAssignee
    @NotBlank(message = "ASSIGNEE не может быть пустым")
    private String assignee;

    @Schema(description = "Спринт", example = "id спринта")
    @ValidSprintId
    private String sprintId;

    @Schema(description = "Тип задачи", example = "TASK")
    @NotBlank(message = "Поле TASK_TYPE не может быть пустым")
    @ValidTaskType
    private String taskType;

    @Schema(description = "ИД статуса задачи", example = "123")
    private Long status;

    @Schema(description = "Оценка задачи", example = "3")
    @ValidEstimation
    private Integer estimation;
}