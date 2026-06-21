package ru.worktechlab.work_task.dto.projects;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class ProjectRequestDto {
    @NotNull
    @Schema(description = "Название проекта")
    private String name;
    @Schema(description = "Комментарий к проекту")
    private String description;
    @NotNull
    @Schema(description = "Код проекта")
    private String code;
}
