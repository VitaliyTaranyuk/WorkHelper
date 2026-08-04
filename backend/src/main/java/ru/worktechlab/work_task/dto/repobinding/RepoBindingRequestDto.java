package ru.worktechlab.work_task.dto.repobinding;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "Привязка проекта к репозиторию (T-510)")
@Getter
@Setter
@NoArgsConstructor
public class RepoBindingRequestDto {

    /**
     * Провайдер — строка, а не enum: добавление нового не должно требовать
     * миграции. Маска не даёт превратить поле в свалку произвольного текста.
     */
    public static final String PROVIDER_PATTERN = "^[a-z][a-z0-9-]{1,31}$";

    /**
     * Только http(s). Схемы вроде `file:` или `javascript:` в адресе, который
     * потом покажут ссылкой в интерфейсе, недопустимы.
     */
    public static final String URL_PATTERN = "^https?://[^\\s]+$";

    @Schema(description = "Провайдер: github, gitlab, …", example = "github")
    @NotBlank(message = "Провайдер не может быть пустым")
    @Pattern(regexp = PROVIDER_PATTERN,
            message = "Провайдер: 2–32 символа, строчные латинские буквы, цифры и дефис")
    private String provider;

    @Schema(description = "Адрес репозитория", example = "https://github.com/VitaliyTaranyuk/WorkHelper")
    @NotBlank(message = "Адрес репозитория не может быть пустым")
    @Size(max = 512, message = "Адрес репозитория длиннее 512 символов")
    @Pattern(regexp = URL_PATTERN, message = "Адрес должен начинаться с http:// или https://")
    private String url;

    @Schema(description = "Ветка по умолчанию", example = "main")
    @NotBlank(message = "Ветка по умолчанию не может быть пустой")
    @Size(max = 255, message = "Имя ветки длиннее 255 символов")
    private String defaultBranch;
}
