package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.projects.ProjectDto;
import ru.worktechlab.work_task.dto.projects.ShortProjectDataDto;
import ru.worktechlab.work_task.models.enums.ProjectStatus;
import ru.worktechlab.work_task.models.tables.Project;

import java.util.List;

@Mapper(config = MapStructConfiguration.class, uses = {UserMapper.class, TaskStatusMapper.class})
public interface ProjectMapper {

    List<ShortProjectDataDto> toShortDataDto(List<Project> projects);

    @Mapping(target = "projectStatus", source = "status", qualifiedByName = "statusDescription")
    ProjectDto toProjectDto(Project project);

    @Named("statusDescription")
    default String getStatusDescription(ProjectStatus projectStatus) {
        return projectStatus.getDescription();
    }
}
