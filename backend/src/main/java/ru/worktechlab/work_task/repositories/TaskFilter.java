package ru.worktechlab.work_task.repositories;

import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.User;

import java.util.Collection;
import java.util.List;

public interface TaskFilter {

    List<TaskModel> findTaskByUsers(Project project, Collection<User> users, Collection<Long> statusIds);
}
