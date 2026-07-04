package ru.worktechlab.work_task.dto.devpanel;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Ветка GitHub, связанная с задачей (ТП-21). */
@Schema(description = "Связанная ветка GitHub")
@Getter
@AllArgsConstructor
public class DevBranchDto {

    @Schema(description = "Имя ветки")
    private final String name;

    @Schema(description = "Ссылка на ветку в GitHub")
    private final String url;

    @Schema(description = "SHA последнего коммита ветки")
    private final String lastCommitSha;

    @Schema(description = "Ссылка на последний коммит")
    private final String lastCommitUrl;
}
