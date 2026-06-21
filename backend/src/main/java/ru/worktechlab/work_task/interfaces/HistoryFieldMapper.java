package ru.worktechlab.work_task.interfaces;

import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.models.tables.TaskHistory;

public interface HistoryFieldMapper {
    boolean supports(String fieldName);

    TaskHistoryResponseDto map(TaskHistory entity);
}
