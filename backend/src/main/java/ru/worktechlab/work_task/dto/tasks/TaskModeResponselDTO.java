package ru.worktechlab.work_task.dto.tasks;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TaskModeResponselDTO {

    private String id;

    private String title;

    private String description;

    private String priority;

    private String creator;

    private String assignee;

    private String projectId;

    private String sprintId;

    private String taskType;

    private Integer estimation;

    private String status;

    private LocalDateTime creationDate;

    private LocalDateTime updateDate;

    private String code;
}
