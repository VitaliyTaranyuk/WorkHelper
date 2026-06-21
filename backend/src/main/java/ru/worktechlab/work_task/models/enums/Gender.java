package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum Gender {
    MALE("Муж."),
    FEMALE("Жен.");

    private final String description;

    Gender(String description) {
        this.description = description;
    }
}
