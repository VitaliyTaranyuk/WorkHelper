package ru.worktechlab.work_task.mappers;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.exceptions.InvalidUserException;
import ru.worktechlab.work_task.interfaces.HistoryFieldMapper;
import ru.worktechlab.work_task.models.tables.TaskHistory;
import ru.worktechlab.work_task.repositories.UserRepository;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AssigneeHistoryFieldMapper implements HistoryFieldMapper {
    private static final String ASSIGNEE_FIELD = "Исполнитель";
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public boolean supports(String fieldName) {
        return ASSIGNEE_FIELD.equals(fieldName);
    }

    @Override
    public TaskHistoryResponseDto map(TaskHistory entity) {
        UserShortDataDto user = userMapper.toShortDataDto(entity.getUser());
        UserShortDataDto oldUser = fetchUserDto(entity.getInitialValue());
        UserShortDataDto newUser = fetchUserDto(entity.getNewValue());

        return TaskHistoryResponseDto.builder()
                .user(user)
                .fieldName(entity.getFieldName())
                .initialUser(oldUser)
                .newUser(newUser)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private UserShortDataDto fetchUserDto(String userId) {
        return userRepository.findById(userId)
                .map(userMapper::toShortDataDto)
                .orElseThrow(() ->
                        new InvalidUserException("Пользователь не найден: " + userId));
    }

}
