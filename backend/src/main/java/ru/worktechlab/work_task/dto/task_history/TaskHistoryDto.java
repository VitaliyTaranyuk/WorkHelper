package ru.worktechlab.work_task.dto.task_history;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TaskHistoryDto {
    private String fieldName;
    private String initialValue;
    private String newValue;
}
