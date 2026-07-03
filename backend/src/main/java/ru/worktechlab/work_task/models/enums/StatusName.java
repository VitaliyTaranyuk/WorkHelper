package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum StatusName {
    // Kanban-колонки нового проекта. Бэклог — НЕ статус и не колонка (ТП-49):
    // это Backlog-СПРИНТ, его задачи живут в разделе «Задачи», а доска
    // показывает только задачи активного спринта. Дефолтный статус — первая
    // колонка To Do (фолбэк для новых задач и при удалении колонок).
    //
    // description хранит ИСХОДНОЕ имя пользовательской сущности при первом
    // создании проекта. Никаких "переводов/локализации" — пользователь
    // увидит ровно то, что мы записали как initial column name.
    TODO("To Do", 1, true, true),
    IN_PROGRESS("In Progress", 2, true, false),
    REVIEW("Review", 3, true, false),
    DONE("Done", 4, true, false),
    CANCELED("Canceled", 5, false, false),
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
