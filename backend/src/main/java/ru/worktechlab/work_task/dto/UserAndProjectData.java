package ru.worktechlab.work_task.dto;

import lombok.Getter;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;

@Getter
public class UserAndProjectData {
    private final Project project;
    private final User user;

    public UserAndProjectData(Project project, User user) {
        this.project = project;
        this.user = user;
    }
}
