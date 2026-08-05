package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

/**
 * T-519: режим доски проекта.
 *
 * <p><b>Kanban-поведение существовало и до этой задачи</b>, но как побочный эффект:
 * {@code TaskPlacementService.boardSprint()} отдавал Backlog-спринт, если активного не
 * было, — то есть режим определялся отсутствием сущности, а не решением пользователя. Это
 * тот же класс ошибки, что «текущий проект» в T-500: состояние есть, а управления им нет.
 *
 * <p>Здесь режим становится **явным полем проекта**. Спринты при этом не удаляются
 * (в отличие от отменённой T-156): переключение обратимо, данные целы, и проект,
 * вернувшийся в {@link #SPRINT}, снова видит свой активный спринт.
 */
@Getter
public enum BoardMode {
    /** Доска показывает задачи активного спринта; без активного — Backlog-спринта. */
    SPRINT("Спринты", "Доска показывает задачи активного спринта"),
    /** Доска всегда показывает Backlog-спринт: спринты не используются. */
    KANBAN("Kanban", "Доска показывает все незавершённые задачи, спринты не используются");

    private final String title;
    private final String description;

    BoardMode(String title, String description) {
        this.title = title;
        this.description = description;
    }

    /**
     * Режим проекта, у которого поле не заполнено.
     *
     * <p>{@code null} означает {@link #SPRINT} — так колонка осталась строго аддитивной:
     * существующие проекты не переписывались миграцией и сохранили прежнее поведение
     * (правило №6 `PHASE5_INVARIANTS §4`). Прецедент «null = значение по умолчанию» в
     * фазе уже есть — {@code rule_set.project_id}.
     */
    public static BoardMode orDefault(BoardMode mode) {
        return mode == null ? SPRINT : mode;
    }
}
