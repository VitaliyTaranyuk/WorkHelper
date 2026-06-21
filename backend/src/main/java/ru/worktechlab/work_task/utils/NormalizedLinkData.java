package ru.worktechlab.work_task.utils;

import ru.worktechlab.work_task.models.enums.LinkTypeName;
import ru.worktechlab.work_task.models.tables.TaskModel;

public record NormalizedLinkData (TaskModel master, TaskModel slave, LinkTypeName linkTypeName) {}
