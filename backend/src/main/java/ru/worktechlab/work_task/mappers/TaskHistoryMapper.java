package ru.worktechlab.work_task.mappers;

import lombok.RequiredArgsConstructor;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.interfaces.HistoryFieldMapper;
import ru.worktechlab.work_task.models.tables.TaskHistory;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskHistoryMapper {
    private final List<HistoryFieldMapper> strategies;

    public List<TaskHistoryResponseDto> convertToDto(List<TaskHistory> entities) {
        if (CollectionUtils.isEmpty(entities)) {
            return Collections.emptyList();
        }
        return entities.stream()
                .map(this::chooseStrategyAndMap)
                .collect(Collectors.toList());
    }

    private TaskHistoryResponseDto chooseStrategyAndMap(TaskHistory entity) {
        String field = entity.getFieldName();
        return strategies.stream()
                .filter(strategy -> strategy.supports(field))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No mapper for field: " + field))
                .map(entity);
    }
}
