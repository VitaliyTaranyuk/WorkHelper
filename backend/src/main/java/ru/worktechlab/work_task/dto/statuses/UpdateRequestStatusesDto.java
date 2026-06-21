package ru.worktechlab.work_task.dto.statuses;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class UpdateRequestStatusesDto {
    @Schema(description = "Список статусов")
    List<TaskStatusRequestDto> statuses = new ArrayList<>();
}
