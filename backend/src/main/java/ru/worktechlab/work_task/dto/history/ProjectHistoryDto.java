package ru.worktechlab.work_task.dto.history;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Schema(description = "Запись истории изменений проекта (дифф)")
@Getter
@AllArgsConstructor
public class ProjectHistoryDto {
    private String changeType;
    private String oldValue;
    private String newValue;
    private String userName;
    private String username;
    private LocalDateTime createdAt;
}
