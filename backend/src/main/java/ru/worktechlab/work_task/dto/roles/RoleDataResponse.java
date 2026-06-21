package ru.worktechlab.work_task.dto.roles;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@AllArgsConstructor
@Setter
public class RoleDataResponse {

    @Schema(description = "Список ролей")
    private List<RoleDataDto> roles;

}
