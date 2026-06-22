package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum StatusName {
    // Kanban-колонки. BACKLOG — дефолтная колонка, куда попадают новые задачи.
    BACKLOG("Бэклог", 1, true, true),
    TODO("К выполнению", 2, true, false),
    IN_PROGRESS("В работе", 3, true, false),
    REVIEW("Ревью", 4, true, false),
    DONE("Готово", 5, true, false),
    CANCELED("Отменена", 6, false, false),
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
