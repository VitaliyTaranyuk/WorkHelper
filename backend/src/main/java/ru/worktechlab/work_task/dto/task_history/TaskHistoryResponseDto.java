package ru.worktechlab.work_task.dto.task_history;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;

import java.time.LocalDateTime;
@JsonInclude(JsonInclude.Include.NON_NULL)
@Getter
@Setter
@Builder
public class TaskHistoryResponseDto {
    private UserShortDataDto user;
    private String fieldName;
    private String initialValue;
    private UserShortDataDto initialUser;
    private String newValue;
    private UserShortDataDto newUser;
    private LocalDateTime createdAt;
}
