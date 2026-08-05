package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "Текущий этап процесса задачи (T-516)")
@Getter
@Setter
@NoArgsConstructor
public class TaskProcessStepRequestDto {

    /** {@code null} означает «снять этап»: задача может выйти из процесса. */
    @Schema(description = "ИД этапа процесса. Пусто — снять этап")
    private String stepId;
}
