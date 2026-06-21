package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.util.CollectionUtils;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.users.UserDataDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.dto.users.UsersProjectsDTO;
import ru.worktechlab.work_task.models.enums.Gender;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(config = MapStructConfiguration.class, uses = {RoleMapper.class})
public interface UserMapper {

    UserShortDataDto toShortDataDto(User user);

    List<UserShortDataDto> toShortDataList(List<User> users);

    @Mapping(source = "id", target = "userId")
    @Mapping(target = "gender", source = "gender", qualifiedByName = "genderDescription")
    @Mapping(target = "permissionProjects", source = "user", qualifiedByName = "projectPermissions")
    UserDataDto toUserFullData(User user);

    @Named("genderDescription")
    default String getGenderDescription(Gender gender) {
        return gender.getDescription();
    }

    @Named("projectPermissions")
    default List<UsersProjectsDTO> getProjectPermissions(User user) {
        List<UsersProjectsDTO> result = new ArrayList<>();
        List<Project> projects = user.getProjects();
        if (CollectionUtils.isEmpty(projects))
            return result;
        String userId = user.getId();
        Set<String> extendedPermissionsProject = user.getExtendedPermissions().stream()
                .map(ep -> ep.getProject().getId())
                .collect(Collectors.toSet());
        projects.forEach(project -> result.add(new UsersProjectsDTO(
                project.getId(), project.getName(), Objects.equals(project.getOwner().getId(), userId), extendedPermissionsProject.contains(project.getId())
        )));
        return result;
    }
}
