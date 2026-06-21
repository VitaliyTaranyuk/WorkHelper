package ru.worktechlab.work_task.dto.statuses;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class StatusListResponseDto {
    @NotNull
    @Schema(description = "ИД проекта")
    private String projectId;
    @Schema(description = "Список доступных статусов")
    private List<TaskStatusDto> statuses = new ArrayList<>();

    public StatusListResponseDto(String projectId) {
        this.projectId = projectId;
    }
}
