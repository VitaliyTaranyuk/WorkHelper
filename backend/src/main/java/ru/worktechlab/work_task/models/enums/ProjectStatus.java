package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum ProjectStatus {
    DRAFT("Черновик"),
    ACTIVE("Активен"),
    FINISHED("Завершен"),
    DELETED("Удален"),
    ;

    private final String description;

    ProjectStatus(String description) {
        this.description = description;
    }
}
