package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.models.enums.TaskSize;

@Schema(description = "Размер задачи (T-516)")
@Getter
@Setter
@NoArgsConstructor
public class TaskSizeRequestDto {

    /**
     * {@code null} допустим и означает «размер снят». Запрещать снятие было бы введением
     * обязательного поля с чёрного хода: правило №5 фазы требует ровно обратного.
     */
    @Schema(description = "XS / S / M / L. Пусто — размер снят", example = "M")
    private TaskSize size;
}
