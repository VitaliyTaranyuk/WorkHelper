package ru.worktechlab.work_task.dto.tasks;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Замена надиктованного описания вычищенным вариантом (ТП-241).
 *
 * Тот же приём, что у {@link AutoTitleRequestDto}: {@code expectedDescription} —
 * текст, с которым задача создавалась, и замена применяется, только если он всё
 * ещё стоит у задачи. Улучшение приходит фоном через несколько секунд после
 * создания, форма к тому моменту закрыта, и без проверки оно затирало бы то,
 * что пользователь успел поправить в карточке.
 *
 * Длина не ограничена: описание — колонка TEXT (ТП-187).
 */
@NoArgsConstructor
@Getter
@Setter
public class AutoDescriptionRequestDto {

    @Schema(description = "Вычищенное описание", example = "При загрузке файла больше 10 МБ карточка падает.")
    @NotBlank(message = "Поле DESCRIPTION не может быть пустым")
    private String description;

    @Schema(description = "Описание, с которым задача создавалась")
    @NotBlank(message = "Поле EXPECTED_DESCRIPTION не может быть пустым")
    private String expectedDescription;
}
