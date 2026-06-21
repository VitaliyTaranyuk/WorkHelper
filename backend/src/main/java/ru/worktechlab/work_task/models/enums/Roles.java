package ru.worktechlab.work_task.models.enums;

import lombok.Getter;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants(onlyExplicitlyIncluded = true)
@Getter
public enum Roles {
    @FieldNameConstants.Include ADMIN("Администратор"),
    @FieldNameConstants.Include PROJECT_OWNER("Руководитель проекта"),
    @FieldNameConstants.Include PROJECT_MEMBER("Участник проекта"),
    @FieldNameConstants.Include POWER_USER("Участник проекта(расширенные права)");

    private final String description;

    Roles(String description) {
        this.description = description;
    }
}
