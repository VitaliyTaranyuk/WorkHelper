package ru.worktechlab.work_task.dto.response_dto;

import lombok.Data;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;

import java.util.List;

@Data
public class UsersTasksInProjectDTO {
    private String userName;
    private List<TaskDataDto> tasks;

    public UsersTasksInProjectDTO(String userName, List<TaskDataDto> tasks) {
        this.userName = userName;
        this.tasks = tasks;
    }
}
