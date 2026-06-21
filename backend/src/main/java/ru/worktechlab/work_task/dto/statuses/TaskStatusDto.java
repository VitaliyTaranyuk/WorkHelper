package ru.worktechlab.work_task.dto.statuses;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class TaskStatusDto {
    @NotNull
    @Schema(description = "ИД статуса")
    private long id;
    @NotNull
    @Schema(description = "Приоритет расстановки на странице")
    private int priority;
    @NotNull
    @Schema(description = "Название статуса")
    private String code;
    @Schema(description = "Описание статуса")
    private String description;
    @NotNull
    @Schema(description = "Признак отображения")
    private boolean viewed;
    @NotNull
    @Schema(description = "ИД проекта")
    private String projectId;
    @Schema(description = "Признак отображения")
    private boolean defaultTaskStatus;
}
