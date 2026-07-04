package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Перенос задачи в спринт с сохранением позиции в списке (ТП-24, DnD):
 * taskIds — полный упорядоченный список задач целевого спринта после броска.
 */
@Schema(description = "Порядок задач спринта после drag-and-drop")
@Data
public class ReorderSprintDTO {

    @Schema(description = "ИД целевого спринта")
    @NotNull(message = "Поле SPRINT_ID не может быть пустым")
    private String sprintId;

    @Schema(description = "Упорядоченный список ИД задач спринта")
    @NotEmpty(message = "Список TASK_IDS не может быть пустым")
    private List<String> taskIds;
}
