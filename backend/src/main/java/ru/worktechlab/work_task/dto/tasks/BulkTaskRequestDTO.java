package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Schema(description = "Массовая операция над задачами")
@Getter
@Setter
@NoArgsConstructor
public class BulkTaskRequestDTO {

    @Schema(description = "ИД проекта-источника")
    @NotNull(message = "Поле PROJECT_ID не может быть пустым")
    private String projectId;

    @Schema(description = "Идентификаторы задач")
    @NotEmpty(message = "Список задач не может быть пустым")
    private List<String> taskIds;

    @Schema(description = "ИД целевого статуса (для массовой смены статуса)")
    private Long statusId;

    @Schema(description = "ИД целевого проекта (для массового переноса)")
    private String targetProjectId;

    @Schema(description = "ИД целевого спринта (для массового переноса между спринтами)")
    private String targetSprintId;
}
