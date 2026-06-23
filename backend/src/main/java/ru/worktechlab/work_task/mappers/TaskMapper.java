package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;
import ru.worktechlab.work_task.models.tables.TaskModel;

import java.util.List;

@Mapper(config = MapStructConfiguration.class, uses = {UserMapper.class, TaskStatusMapper.class})
public interface TaskMapper {

    @Mapping(source = "project.id", target = "projectId")
    @Mapping(source = "sprint.id", target = "sprintId")
    @Mapping(source = "creationDate", target = "createdAt")
    @Mapping(source = "updateDate", target = "updatedAt")
    TaskDataDto toDo(TaskModel taskModel);

    List<TaskDataDto> toDo(List<TaskModel> tasks);
}
