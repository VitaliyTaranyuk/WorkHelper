package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@NoArgsConstructor
@Getter
@Setter
public class SprintDtoRequest {
    @NotNull
    @Schema(description = "Название спринта")
    private String name;
    @Schema(description = "цель спринта")
    private String goal;
    @Schema(description = "Дата окончания спринта")
    private LocalDate startDate;
    @Schema(description = "Дата завершения спринта")
    private LocalDate endDate;
}
