package ru.worktechlab.work_task.dto.invites;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Созданная ссылка-приглашение (ТП-35). */
@Schema(description = "Токен приглашения в проект")
@Getter
@AllArgsConstructor
public class InviteCreateResponseDto {

    @Schema(description = "Одноразовый токен приглашения")
    private final String token;

    @Schema(description = "Название проекта")
    private final String projectName;
}
