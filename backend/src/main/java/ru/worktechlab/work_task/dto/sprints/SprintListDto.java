package ru.worktechlab.work_task.dto.sprints;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Обёртка списка спринтов с задачами. Фронтенд ожидает форму {"sprints": [...]}.
 */
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SprintListDto {
    @Schema(description = "Список спринтов проекта")
    private List<SprintMinDto> sprints;
}
