package ru.worktechlab.work_task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class StringIdsDto {

    @Schema(description = "Список ИД")
    private List<String> ids;
}
