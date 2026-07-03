package ru.worktechlab.work_task.dto.devpanel;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Pull request GitHub, связанный с задачей (ТП-21). */
@Schema(description = "Связанный pull request GitHub")
@Getter
@AllArgsConstructor
public class DevPullRequestDto {

    @Schema(description = "Номер PR")
    private final int number;

    @Schema(description = "Заголовок PR")
    private final String title;

    @Schema(description = "Состояние: open / merged / closed")
    private final String state;

    @Schema(description = "Ссылка на PR в GitHub")
    private final String url;

    @Schema(description = "Ветка PR (head)")
    private final String branch;
}
