package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/** Сила правила (ADR-018): обязательное или рекомендательное. */
@Getter
public enum RuleStrength {
    MUST("Обязательно"),
    SHOULD("Рекомендуется");

    private final String description;

    RuleStrength(String description) {
        this.description = description;
    }
}
