package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum StatusName {
    TODO("сделать", 1, true, true),
    IN_PROGRESS("в работе", 2, true, false),
    REVIEW("ревью", 3, true, false),
    DONE("готово", 4, true, false),
    CANCELED("отменена", 5, false, false),
    ;

    private final String description;
    private final int priority;
    private final boolean viewed;
    private final boolean defaultTaskStatus;

    StatusName(String description, int priority, boolean viewed, boolean defaultTaskStatus) {
        this.description = description;
        this.priority = priority;
        this.viewed = viewed;
        this.defaultTaskStatus = defaultTaskStatus;
    }
}
