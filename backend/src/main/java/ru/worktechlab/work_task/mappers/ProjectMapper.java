package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.projects.ProjectDto;
import ru.worktechlab.work_task.dto.projects.ShortProjectDataDto;
import ru.worktechlab.work_task.models.enums.BoardMode;
import ru.worktechlab.work_task.models.enums.ProjectStatus;
import ru.worktechlab.work_task.models.tables.Project;

import java.util.List;

@Mapper(config = MapStructConfiguration.class, uses = {UserMapper.class, TaskStatusMapper.class})
public interface ProjectMapper {

    List<ShortProjectDataDto> toShortDataDto(List<Project> projects);

    @Mapping(target = "projectStatus", source = "status", qualifiedByName = "statusDescription")
    // T-519: незаполненный режим доски превращается в SPRINT здесь, в одном месте, —
    // иначе «null означает спринты» пришлось бы помнить каждому потребителю DTO.
    @Mapping(target = "boardMode", source = "boardMode", qualifiedByName = "boardModeName")
    ProjectDto toProjectDto(Project project);

    @Named("boardModeName")
    default String getBoardModeName(BoardMode boardMode) {
        return BoardMode.orDefault(boardMode).name();
    }

    @Named("statusDescription")
    default String getStatusDescription(ProjectStatus projectStatus) {
        return projectStatus.getDescription();
    }
}
