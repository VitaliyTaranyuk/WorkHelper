package ru.worktechlab.work_task.dto.notifications;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Schema(description = "Уведомление")
@Getter
@AllArgsConstructor
public class NotificationDto {
    private String id;
    private String type;
    private String message;
    private String taskId;
    private String taskCode;
    private String commentId;
    private String actorUsername;
    private boolean read;
    private LocalDateTime createdAt;
}
