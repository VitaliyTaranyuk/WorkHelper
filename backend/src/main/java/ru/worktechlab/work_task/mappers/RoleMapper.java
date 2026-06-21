package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.roles.RoleDataDto;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.RoleModel;

import java.util.Collection;
import java.util.List;

@Mapper(config = MapStructConfiguration.class)
public interface RoleMapper {

    @Mapping(source = "id", target = "roleId")
    @Mapping(target = "roleCode", source = "name", qualifiedByName = "roleCode")
    @Mapping(target = "roleName", source = "name", qualifiedByName = "roleValue")
    RoleDataDto toRoleDto(RoleModel role);

    List<RoleDataDto> toRoleDtoList(Collection<RoleModel> roles);

    @Named("roleCode")
    default String getRoleCode(Roles role) {
        return role.name();
    }

    @Named("roleValue")
    default String getRoleValue(Roles role) {
        return role.getDescription();
    }
}
