package ru.worktechlab.work_task.dto.task_comment;

import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;

import java.time.LocalDateTime;

@Getter
@Setter
public class AllTasksCommentsResponseDto {
    private UserShortDataDto user;
    private String commentId;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}