package ru.worktechlab.work_task.dto.roles;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@NoArgsConstructor
@Setter
public class RoleDataDto {

    @Schema(description = "ИД роли")
    private String roleId;

    @Schema(description = "Название роли в системе")
    private String roleCode;

    @Schema(description = "Описание роли")
    private String roleName;
}
