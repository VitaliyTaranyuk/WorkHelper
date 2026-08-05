package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.models.enums.TaskSize;

@Schema(description = "Создание или изменение этапа процесса (T-515)")
@Getter
@Setter
@NoArgsConstructor
public class ProcessStepRequestDto {

    @Schema(description = "Короткий идентификатор этапа", example = "A1")
    @NotBlank(message = "Код этапа не может быть пустым")
    @Size(max = 16, message = "Код этапа длиннее 16 символов")
    private String code;

    @Schema(description = "Название этапа", example = "Анализ")
    @NotBlank(message = "Название этапа не может быть пустым")
    @Size(max = 128, message = "Название этапа длиннее 128 символов")
    private String name;

    @Schema(description = "Что делается на этапе")
    @Size(max = 512, message = "Описание этапа длиннее 512 символов")
    private String description;

    /**
     * T-516. Тип, а не строка: неизвестный размер обязан отвергаться понятным 400 на
     * границе, а не доезжать до БД. {@code null} — этап необязателен ни при каком размере.
     */
    @Schema(description = "С какого размера задачи этап обязателен (XS/S/M/L). Пусто — необязателен",
            example = "XS")
    private TaskSize requiredFromSize;
}
