package ru.worktechlab.work_task.dto.notifications;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Schema(description = "Счётчик непрочитанных уведомлений")
@Getter
@AllArgsConstructor
public class UnreadCountDto {
    private long count;
}
