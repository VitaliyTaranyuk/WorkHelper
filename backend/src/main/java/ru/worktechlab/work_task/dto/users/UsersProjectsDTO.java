package ru.worktechlab.work_task.dto.users;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UsersProjectsDTO {

    @Schema(description = "ИД проекта")
    private String projectId;

    @Schema(description = "Название проекта")
    private String projectName;

    @Schema(description = "Признак, что является владельцем")
    private boolean owner;

    @Schema(description = "Признак, что имеет расширенные права")
    private boolean extendedPermission;

    public UsersProjectsDTO(String projectId, String projectName, boolean owner, boolean extendedPermission) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.owner = owner;
        this.extendedPermission = extendedPermission;
    }
}
