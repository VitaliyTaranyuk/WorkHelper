package ru.worktechlab.work_task.mappers;

import lombok.NoArgsConstructor;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.task_link.LinkResponseDto;
import ru.worktechlab.work_task.models.enums.LinkTypeName;
import ru.worktechlab.work_task.models.tables.Link;
import ru.worktechlab.work_task.models.tables.TaskModel;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@NoArgsConstructor
public class LinkMapper {

    public List<LinkResponseDto> convertToDto(List<Link> entities, TaskModel task) {
        if (CollectionUtils.isEmpty(entities)) {
            return Collections.emptyList();
        }
        return entities.stream()
                .map(entity -> mapToDto(entity, task))
                .collect(Collectors.toList());
    }

    private LinkResponseDto mapToDto(Link link, TaskModel task) {
        if (!isTaskMaster(link, task) && link.getName().inverseExist()) {
            return toDto(link.getTaskSlave(), link.getTaskMaster(), link.getName().getInverse(), link);
        }
        return toDto(link.getTaskMaster(), link.getTaskSlave(), link.getName(), link);
    }

    private LinkResponseDto toDto(TaskModel source, TaskModel target, LinkTypeName typeName, Link link) {
        return new LinkResponseDto(
                link.getId(),
                source.getId(),
                target.getId(),
                typeName.name(),
                typeName.getDescription()
        );
    }

    private boolean isTaskMaster(Link link, TaskModel task) {
        return Objects.equals(link.getTaskMaster().getId(), task.getId());
    }
}
