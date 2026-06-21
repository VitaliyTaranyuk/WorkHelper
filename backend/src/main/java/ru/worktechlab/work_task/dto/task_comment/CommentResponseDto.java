package ru.worktechlab.work_task.dto.task_comment;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentResponseDto {
    private String commentId;

    public CommentResponseDto(String commentId) {
        this.commentId = commentId;
    }
}
