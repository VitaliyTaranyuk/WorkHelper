package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Контракт PUT /tasks/update-sprint: фронтенд передаёт целевой спринт в поле
 * "sprintId" (см. сгенерированные OpenAPI-типы клиента). Не заменять на
 * BulkTaskRequestDTO — там целевой спринт называется targetSprintId, из-за
 * подмены DTO перенос задач между спринтами отвечал 404.
 */
@Schema(description = "Перенос задач в другой спринт")
@Getter
@Setter
@NoArgsConstructor
public class UpdateTasksSprintRequestDto {

    @Schema(description = "Проект задачи", example = "id проекта")
    @NotNull(message = "Поле PROJECT_ID не может быть пустым")
    private String projectId;

    @Schema(description = "Ид спринта")
    @NotNull(message = "Поле SPRINT_ID не может быть пустым")
    private String sprintId;

    @Schema(description = "Список ИД задач")
    @NotEmpty(message = "Список задач не может быть пустым")
    private List<String> taskIds;

    /** Представление в виде bulk-запроса (единая логика переноса в сервисе). */
    public BulkTaskRequestDTO toBulkRequest() {
        BulkTaskRequestDTO bulk = new BulkTaskRequestDTO();
        bulk.setProjectId(projectId);
        bulk.setTaskIds(taskIds);
        bulk.setTargetSprintId(sprintId);
        return bulk;
    }
}
