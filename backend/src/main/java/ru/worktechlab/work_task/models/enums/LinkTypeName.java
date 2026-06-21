
package ru.worktechlab.work_task.models.enums;

import lombok.Getter;

@Getter
public enum LinkTypeName {
    RELATED("Связанные"),
    BLOCKS("Блокирует"),
    BLOCKED_BY("Заблокирована"),
    DEPENDS_ON("Зависит от"),
    DUPLICATES("Дублирует"),
    PARENT_OF("Родительская"),
    CHILD_OF("Дочерняя"),
    AFFECTS("Влияет на");

    private final String description;
    private LinkTypeName inverse;
    private LinkTypeName canonical;

    LinkTypeName(String description) {
        this.description = description;
    }

    public LinkTypeName getInverse() {
        return inverse;
    }

    public boolean inverseExist() {
        return this.inverse != null;
    }

    public LinkTypeName getCanonical() {
        return canonical != null ? canonical : this;
    }

    static {
        BLOCKS.inverse = BLOCKED_BY;
        BLOCKED_BY.inverse = BLOCKS;
        PARENT_OF.inverse = CHILD_OF;
        CHILD_OF.inverse = PARENT_OF;

        BLOCKS.canonical = BLOCKS;
        BLOCKED_BY.canonical = BLOCKS;
        PARENT_OF.canonical = PARENT_OF;
        CHILD_OF.canonical = PARENT_OF;
        RELATED.canonical = RELATED;

        DEPENDS_ON.canonical = DEPENDS_ON;
        DUPLICATES.canonical = DUPLICATES;
        AFFECTS.canonical = AFFECTS;
    }
}