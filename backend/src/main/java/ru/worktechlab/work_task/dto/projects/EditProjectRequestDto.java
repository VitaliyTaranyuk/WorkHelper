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
public class EditProjectRequestDto {
    @NotNull
    @Schema(description = "Название проекта")
    private String name;
    @Schema(description = "Комментарий к проекту")
    private String description;
    // ТП-190: та же маска кода, что при создании (единый формат).
    @NotNull
    @Pattern(regexp = ProjectRequestDto.CODE_PATTERN, message = ProjectRequestDto.CODE_MESSAGE)
    @Schema(description = "Код проекта (2–6 символов, с буквы)")
    private String code;
}
