package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Schema(description = "Переупорядочивание задач внутри колонки (drag-and-drop)")
@Getter
@Setter
@NoArgsConstructor
public class ReorderColumnDTO {

    @Schema(description = "ИД колонки (статуса), в которую попадают задачи")
    @NotNull(message = "Поле STATUS_ID не может быть пустым")
    private Long statusId;

    @Schema(description = "Идентификаторы задач в желаемом порядке (сверху вниз)")
    @NotNull(message = "Список задач не может быть пустым")
    private List<String> taskIds;
}
