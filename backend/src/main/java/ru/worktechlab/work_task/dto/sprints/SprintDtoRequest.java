package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@NoArgsConstructor
@Getter
@Setter
public class SprintDtoRequest {
    // ТП-70: название опционально — основной идентификатор спринта в зрелых
    // TMS: диапазон дат и статус; имя — дополнительное описание.
    @Schema(description = "Название спринта (необязательно)")
    private String name;
    @Schema(description = "цель спринта")
    private String goal;
    @Schema(description = "Дата окончания спринта")
    private LocalDate startDate;
    @Schema(description = "Дата завершения спринта")
    private LocalDate endDate;
}
