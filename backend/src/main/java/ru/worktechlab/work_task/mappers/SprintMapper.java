package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.sprints.SprintInfoDTO;
import ru.worktechlab.work_task.models.tables.Sprint;

@Mapper(config = MapStructConfiguration.class, uses = {UserMapper.class})
public interface SprintMapper {

    SprintInfoDTO toSprintInfoDto(Sprint sprint);
}
