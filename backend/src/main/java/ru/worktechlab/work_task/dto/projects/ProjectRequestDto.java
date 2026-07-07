package ru.worktechlab.work_task.dto.projects;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class ProjectRequestDto {
    // ТП-190: код проекта — префикс кодов задач («ТП-1»). Формат (маска):
    // 2–6 символов, первый — буква (латиница/кириллица), дальше буквы/цифры.
    // Тот же паттерн проверяет фронт (projectCode.ts) для мгновенной подсказки.
    public static final String CODE_PATTERN = "^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё0-9]{1,5}$";
    public static final String CODE_MESSAGE = "Код проекта: 2–6 символов, начинается с буквы (латиница/кириллица), дальше буквы или цифры";

    @NotNull
    @Schema(description = "Название проекта")
    private String name;
    @Schema(description = "Комментарий к проекту")
    private String description;
    @NotNull
    @Pattern(regexp = CODE_PATTERN, message = CODE_MESSAGE)
    @Schema(description = "Код проекта (2–6 символов, с буквы)")
    private String code;
}
