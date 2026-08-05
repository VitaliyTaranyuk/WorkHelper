package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/** Тип правила (ADR-018): как оно применяется исполнителем. */
@Getter
public enum RuleKind {
    PRINCIPLE("Принцип — как думать"),
    GATE("Гейт — что истинно, чтобы двигаться дальше"),
    PROCEDURE("Процедура — последовательность действий"),
    PROHIBITION("Запрет — чего делать нельзя");

    private final String description;

    RuleKind(String description) {
        this.description = description;
    }
}
