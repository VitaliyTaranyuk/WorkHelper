package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/**
 * T-515: этапы процесса задачи нового проекта.
 *
 * <p>Заполняются при создании проекта тем же способом, что колонки доски
 * ({@code StatusName} → {@code createDefaultStatuses}): механизм уже есть и работает,
 * заводить второй было бы новизной ради новизны (**K-38**).
 *
 * <p>Состав — протокол исполнения задачи из {@code .ai/TASK_REGISTRY.md}: актуальность,
 * анализ, контр-анализ отдельным проходом, решение, реализация, верификация. Это дефолт
 * нового проекта, а не догма: этапы принадлежат проекту и правятся в его настройках
 * (ADR-021).
 */
@Getter
public enum ProcessStepName {
    A0("A0", "Актуальность", 1),
    A1("A1", "Анализ", 2),
    A2("A2", "Контр-анализ", 3),
    D("D", "Решение", 4),
    I("I", "Реализация", 5),
    V("V", "Верификация", 6),
    ;

    private final String code;
    private final String name;
    private final int position;

    ProcessStepName(String code, String name, int position) {
        this.code = code;
        this.name = name;
        this.position = position;
    }
}
