package ru.worktechlab.work_task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class EnumDto {

    @Schema(description = "Название перечисления")
    private String code;

    @Schema(description = "Дополнительное значение")
    private String value;
}
