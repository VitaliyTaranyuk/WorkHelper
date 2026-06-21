package ru.worktechlab.work_task.mappers;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.interfaces.HistoryFieldMapper;
import ru.worktechlab.work_task.models.tables.TaskHistory;

@Component
@RequiredArgsConstructor
public class DefaultHistoryFieldMapper implements HistoryFieldMapper {
    private static final String ASSIGNEE_FIELD = "Исполнитель";
    private final UserMapper userMapper;

    @Override
    public boolean supports(String fieldName) {
        return !ASSIGNEE_FIELD.equals(fieldName);
    }

    @Override
    public TaskHistoryResponseDto map(TaskHistory entity) {
        UserShortDataDto userDto = userMapper.toShortDataDto(entity.getUser());
        return TaskHistoryResponseDto.builder()
                .user(userDto)
                .fieldName(entity.getFieldName())
                .initialValue(entity.getInitialValue())
                .newValue(entity.getNewValue())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
