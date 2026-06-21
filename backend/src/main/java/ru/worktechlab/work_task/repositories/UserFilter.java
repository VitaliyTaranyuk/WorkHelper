package ru.worktechlab.work_task.repositories;

import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;

import java.util.Collection;
import java.util.List;

public interface UserFilter {

    List<User> findProjectUsers(Collection<String> userIds, Project project);
}
