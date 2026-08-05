package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/**
 * T-516: размер задачи.
 *
 * <p>Размер отвечает не на вопрос «сколько часов», а на вопрос «насколько глубоко идёт
 * разбор»: `PROJECT_RULES §Пропорциональность анализа` требует, чтобы объём анализа был
 * пропорционален изменению, а не одинаков для опечатки и для новой подсистемы. Оценка в
 * часах у задачи уже есть отдельным полем (`estimation`) и этим полем не заменяется.
 *
 * <p>Порядок констант несёт смысл: этап, обязательный «начиная с S», обязателен и для M, и
 * для L. Сравнение идёт по {@link #ordinal()} — новый размер вставляется в нужное место
 * перечисления, а не дописывается в конец.
 */
@Getter
public enum TaskSize {
    XS("XS", "Правка в одном месте, разбор минимальный"),
    S("S", "Небольшое изменение в пределах одного модуля"),
    M("M", "Затрагивает несколько модулей или контракт"),
    L("L", "Новая подсистема или изменение архитектуры"),
    ;

    private final String code;
    private final String description;

    TaskSize(String code, String description) {
        this.code = code;
        this.description = description;
    }

    /** Покрывает ли этот размер порог: этап «обязателен с S» обязателен для S, M и L. */
    public boolean atLeast(TaskSize threshold) {
        return threshold != null && this.ordinal() >= threshold.ordinal();
    }

    /** Понижение размера — то, что протокол требует фиксировать (**K-44**). */
    public static boolean isLowering(TaskSize from, TaskSize to) {
        return from != null && to != null && to.ordinal() < from.ordinal();
    }
}
