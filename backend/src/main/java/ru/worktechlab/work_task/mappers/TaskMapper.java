package ru.worktechlab.work_task.mappers;

import org.mapstruct.IterableMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
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
    // Вычисляется сервисом по последнему комментарию (ТП-45), в entity поля нет
    @Mapping(target = "awaitingReply", ignore = true)
    @Named("detail")
    TaskDataDto toDo(TaskModel taskModel);

    @IterableMapping(qualifiedByName = "detail")
    List<TaskDataDto> toDo(List<TaskModel> tasks);

    /**
     * Списковый маппинг (ТП-187): описание — длинный текст без лимита, в
     * списках/доске оно не отображается и не участвует в поиске (code/title),
     * поэтому тело в списковые выдачи не кладём — полный текст карточка
     * получает своим запросом (getTaskByCode / task detail).
     */
    @Mapping(source = "project.id", target = "projectId")
    @Mapping(source = "sprint.id", target = "sprintId")
    @Mapping(source = "creationDate", target = "createdAt")
    @Mapping(source = "updateDate", target = "updatedAt")
    @Mapping(target = "awaitingReply", ignore = true)
    @Mapping(target = "description", ignore = true)
    @Named("listItem")
    TaskDataDto toListItem(TaskModel taskModel);

    @IterableMapping(qualifiedByName = "listItem")
    List<TaskDataDto> toListItems(List<TaskModel> tasks);
}
