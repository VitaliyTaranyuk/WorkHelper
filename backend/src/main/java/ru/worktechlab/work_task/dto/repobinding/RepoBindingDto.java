package ru.worktechlab.work_task.dto.repobinding;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Привязка проекта к репозиторию")
public record RepoBindingDto(
        String id,
        String provider,
        String url,
        String defaultBranch,
        LocalDateTime createdAt
) {
}
