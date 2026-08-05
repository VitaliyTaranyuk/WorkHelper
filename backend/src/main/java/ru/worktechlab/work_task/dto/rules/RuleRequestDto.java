package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.worktechlab.work_task.models.enums.RuleKind;
import ru.worktechlab.work_task.models.enums.RuleLevel;
import ru.worktechlab.work_task.models.enums.RuleStrength;
import ru.worktechlab.work_task.models.enums.RuleVerification;

/**
 * Создание или изменение правила (T-511).
 *
 * <p>Перечисления приходят типами, а не строками: неизвестное значение обязано
 * отвергаться на границе понятным 400, а не доезжать до БД. Валидатор проверяет
 * только формат и существование — доступ решает сервис (**W-04**).
 */
@Schema(description = "Создание или изменение правила (T-511)")
@Getter
@Setter
@NoArgsConstructor
public class RuleRequestDto {

    /**
     * Формат кода тот же, что у реестра правил проекта: буквенный префикс,
     * дефис, номер — {@code K-27}, {@code W-03}, {@code F-01}. Маска не даёт
     * превратить идентификатор в свободный текст, но и не навязывает конкретные
     * префиксы: набор переносится в чужой проект со своими.
     */
    public static final String CODE_PATTERN = "^[A-Za-z][A-Za-z0-9]{0,7}-[0-9]{1,4}$";

    @Schema(description = "Человекочитаемый идентификатор", example = "K-27")
    @NotBlank(message = "Код правила не может быть пустым")
    @Pattern(regexp = CODE_PATTERN, message = "Код правила: префикс, дефис и номер — например K-27")
    private String code;

    @Schema(description = "Уровень переносимости", example = "CORE")
    @NotNull(message = "Уровень правила обязателен")
    private RuleLevel level;

    @Schema(description = "Тип правила", example = "PROCEDURE")
    @NotNull(message = "Тип правила обязателен")
    private RuleKind kind;

    @Schema(description = "Сила правила", example = "MUST")
    @NotNull(message = "Сила правила обязательна")
    private RuleStrength strength;

    @Schema(description = "Условие загрузки правила", example = "всегда")
    @NotBlank(message = "Триггер не может быть пустым")
    @Size(max = 255, message = "Триггер длиннее 255 символов")
    private String triggerCondition;

    @Schema(description = "Способ проверки", example = "MANUAL")
    @NotNull(message = "Способ проверки обязателен")
    private RuleVerification verification;

    @Schema(description = "Формулировка правила")
    @NotBlank(message = "Формулировка правила не может быть пустой")
    @Size(max = 4000, message = "Формулировка длиннее 4000 символов")
    private String body;
}
