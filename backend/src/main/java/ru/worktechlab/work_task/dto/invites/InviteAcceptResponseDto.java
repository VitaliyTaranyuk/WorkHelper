package ru.worktechlab.work_task.dto.invites;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Результат присоединения по ссылке-приглашению (ТП-35). */
@Schema(description = "Результат принятия приглашения")
@Getter
@AllArgsConstructor
public class InviteAcceptResponseDto {

    @Schema(description = "ИД проекта")
    private final String projectId;

    @Schema(description = "Название проекта")
    private final String projectName;

    @Schema(description = "Пользователь уже был участником проекта")
    private final boolean alreadyMember;
}
