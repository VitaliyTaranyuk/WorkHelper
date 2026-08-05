package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "Создание или изменение набора правил (T-511)")
@Getter
@Setter
@NoArgsConstructor
public class RuleSetRequestDto {

    @Schema(description = "Название набора", example = "Ядро WorkHelper")
    @NotBlank(message = "Название набора не может быть пустым")
    @Size(max = 128, message = "Название набора длиннее 128 символов")
    private String name;

    @Schema(description = "Описание набора")
    @Size(max = 512, message = "Описание набора длиннее 512 символов")
    private String description;
}
