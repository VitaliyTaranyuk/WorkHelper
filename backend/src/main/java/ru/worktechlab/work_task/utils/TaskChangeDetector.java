package ru.worktechlab.work_task.utils;

import lombok.Getter;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Getter
public class TaskChangeDetector {

    private final List<TaskHistoryDto> taskHistories = new ArrayList<>();

    public void add(String fieldName, String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            taskHistories.add(new TaskHistoryDto(fieldName,
                    oldVal == null ? "" : oldVal,
                    newVal == null ? "" : newVal
            ));
        }
    }

    public void add(String oldVal, String newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            taskHistories.add(new TaskHistoryDto("Комментарий",
                    oldVal,
                    newVal
            ));
        }
    }
}
