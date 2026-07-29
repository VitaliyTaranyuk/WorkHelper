package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Замена автоматически сформированного названия улучшенным (ТП-240).
 *
 * {@code expectedTitle} — название, с которым задача создавалась: сервер
 * применяет новое ТОЛЬКО если оно всё ещё стоит у задачи (compare-and-set).
 * Улучшение приходит фоном через несколько секунд после создания, и без этой
 * проверки оно затирало бы название, которое пользователь успел задать сам.
 */
@NoArgsConstructor
@Getter
@Setter
public class AutoTitleRequestDto {

    @Schema(description = "Улучшенное название", example = "Ускорить создание задачи")
    @NotBlank(message = "Поле TITLE не может быть пустым")
    @Size(max = 255, message = "Длина поля TITLE не может быть более 255 символов")
    private String title;

    @Schema(description = "Название, с которым задача создавалась", example = "Создание задачи")
    @NotBlank(message = "Поле EXPECTED_TITLE не может быть пустым")
    @Size(max = 255, message = "Длина поля EXPECTED_TITLE не может быть более 255 символов")
    private String expectedTitle;
}
