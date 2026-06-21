package ru.worktechlab.work_task.dto.projects;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import ru.worktechlab.work_task.models.tables.Project;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class ProjectsResponse {
    private Project projects;
    private String projectId;

    public ProjectsResponse(String projectId) {
        this.projectId = projectId;
    }
}
