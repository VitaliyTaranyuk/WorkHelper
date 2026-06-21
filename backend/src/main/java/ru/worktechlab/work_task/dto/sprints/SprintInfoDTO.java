package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;

import java.time.LocalDate;

@NoArgsConstructor
@Getter
@Setter
public class SprintInfoDTO {
    @NotNull
    @Schema(description = "Ид спринта")
    private String id;
    @NotNull
    @Schema(description = "Название спринта")
    private String name;
    @Schema(description = "Цель спринта")
    private String goal;
    @Schema(description = "Дата окончания спринта")
    private LocalDate startDate;
    @Schema(description = "Дата завершения спринта")
    private LocalDate endDate;
    @NotNull
    @Schema(description = "Создатель спринта")
    private UserShortDataDto creator;
    @NotNull
    @Schema(description = "Флаг, показывающий активен ли спринт")
    private boolean active;
    @NotNull
    @Schema(description = "Флаг, показывающий дефолтный спринт")
    private boolean defaultSprint;
}
