package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.statuses.TaskStatusDto;
import ru.worktechlab.work_task.dto.statuses.TaskStatusShortDto;
import ru.worktechlab.work_task.models.tables.TaskStatus;

@Mapper(config = MapStructConfiguration.class)
public interface TaskStatusMapper {

    @Mapping(source = "project.id", target = "projectId")
    TaskStatusDto todo(TaskStatus status);

    TaskStatusShortDto toShortStatusData(TaskStatus status);
}
