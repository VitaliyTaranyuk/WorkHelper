package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;
import ru.worktechlab.work_task.models.enums.SprintStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * Спринт со списком его задач — используется в разделах Backlog и список спринтов.
 */
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SprintMinDto {
    @Schema(description = "Ид спринта")
    private String id;
    @Schema(description = "Название спринта")
    private String name;
    @Schema(description = "Цель спринта")
    private String goal;
    @Schema(description = "Дата начала спринта")
    private LocalDate startDate;
    @Schema(description = "Дата окончания спринта")
    private LocalDate endDate;
    @Schema(description = "Флаг, показывающий активен ли спринт")
    private boolean active;
    @Schema(description = "Флаг, показывающий приостановлен ли спринт")
    private boolean paused;
    @Schema(description = "Флаг, показывающий дефолтный (Backlog) спринт")
    private boolean defaultSprint;
    @Schema(description = "Состояние спринта: DRAFT | ACTIVE | PAUSED | COMPLETED")
    private SprintStatus status;
    @Schema(description = "Задачи спринта")
    private List<TaskDataDto> tasks;
}
