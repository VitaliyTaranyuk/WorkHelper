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
    private String meetingId;
    private String projectId;
    private String link;
    private String actorUsername;
    private boolean read;
    private LocalDateTime createdAt;
    // ТП-83: текущее состояние связанной задачи (ACTIVE | DONE | CANCELED),
    // вычисляется на лету — уведомление о создании задачи меняет иконку по
    // статусу задачи, без создания новых уведомлений. null, если задачи нет.
    @Schema(description = "Состояние связанной задачи: ACTIVE | DONE | CANCELED")
    private String taskState;
}
