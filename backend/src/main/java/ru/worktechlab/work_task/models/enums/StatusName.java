package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum StatusName {
    // Kanban-колонки. BACKLOG — дефолтная категория для новых задач, но
    // отрисовывается как ОТДЕЛЬНЫЙ раздел (страница /backlog), а не как колонка
    // на основной канбан-доске (viewed=false). Это соответствует Jira/Trello.
    //
    // description хранит ИСХОДНОЕ имя пользовательской сущности при первом
    // создании проекта. Никаких "переводов/локализации" — пользователь
    // увидит ровно то, что мы записали как initial column name.
    BACKLOG("Backlog", 1, false, true),
    TODO("To Do", 2, true, false),
    IN_PROGRESS("In Progress", 3, true, false),
    REVIEW("Review", 4, true, false),
    DONE("Done", 5, true, false),
    CANCELED("Canceled", 6, false, false),
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
