package ru.worktechlab.work_task.models.enums;

/**
 * Жизненный цикл спринта (по образцу Jira/Linear).
 *
 * Состояние выводится из полей Sprint (active, paused, finishedAt) и НЕ хранится
 * отдельной колонкой — единственный источник истины остаётся в булевых флагах,
 * что исключает рассинхрон.
 */
public enum SprintStatus {
    DRAFT,      // создан, ещё не запускался
    ACTIVE,     // запущен и идёт работа
    PAUSED,     // временно приостановлен
    COMPLETED   // завершён
}
