package ru.worktechlab.work_task.dto.devpanel;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/** Панель «Разработка» карточки задачи (ТП-21): связанные ветки и PR GitHub. */
@Schema(description = "Данные разработки по задаче (ветки и PR GitHub)")
@Getter
@AllArgsConstructor
public class DevInfoDto {

    @Schema(description = "GitHub доступен и данные актуальны")
    private final boolean available;

    @Schema(description = "Причина недоступности (если available=false)")
    private final String message;

    @Schema(description = "Связанные ветки")
    private final List<DevBranchDto> branches;

    @Schema(description = "Связанные pull request'ы")
    private final List<DevPullRequestDto> pullRequests;

    public static DevInfoDto of(List<DevBranchDto> branches, List<DevPullRequestDto> pullRequests) {
        return new DevInfoDto(true, null, branches, pullRequests);
    }

    public static DevInfoDto unavailable(String message) {
        return new DevInfoDto(false, message, List.of(), List.of());
    }
}
