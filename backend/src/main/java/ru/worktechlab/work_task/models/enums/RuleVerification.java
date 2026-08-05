package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/**
 * Способ проверки правила (ADR-018).
 *
 * <p>Поле обязательное неслучайно: правило без способа проверки — это пожелание
 * ({@code .ai/PHASE5_INVARIANTS.md} §1). {@code MANUAL} — честный ответ «только
 * глазами», а не отсутствие ответа.
 */
@Getter
public enum RuleVerification {
    AUTO("Авто — проверяет машина"),
    SEMI("Полуавто — команда есть, запускать осознанно"),
    MANUAL("Ручная — только глазами");

    private final String description;

    RuleVerification(String description) {
        this.description = description;
    }
}
