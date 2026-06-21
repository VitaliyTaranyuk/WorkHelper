package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.roles.RoleDataResponse;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.exceptions.RoleNotFoundException;
import ru.worktechlab.work_task.mappers.RoleMapper;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.ExtendedPermission;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RoleModelRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleModelRepository roleModelRepository;
    private final RoleMapper roleMapper;

    @TransactionMandatory
    public RoleModel getDefaultRole() {
        return getRoleByName(Roles.PROJECT_MEMBER);
    }

    @TransactionMandatory
    public RoleModel getRoleByName(Roles roleValue) {
        return roleModelRepository.findByName(roleValue)
                .orElseThrow(() -> new RoleNotFoundException(String.format("Роль %s не найдена", roleValue.getDescription())));
    }

    @TransactionRequired
    public RoleDataResponse getAllRoles() {
        return new RoleDataResponse(roleMapper.toRoleDtoList(roleModelRepository.findAll()));
    }

    @TransactionMandatory
    public void updateUserRoles(User user,
                                Collection<String> roleIds) throws NotFoundException {
        List<RoleModel> roles = getAndCheckRolesByIds(roleIds);
        roleModelRepository.deleteUserRolesByUserId(user.getId());
        creatUserRoles(user, roles);
    }

    @TransactionMandatory
    public void addUserRoles(User user,
                             Roles role) {
        RoleModel dbRole = getRoleByName(role);
        roleModelRepository.createOrUpdateUserRole(user.getId(), dbRole.getId());
        roleModelRepository.flush();
    }

    @TransactionMandatory
    public void addUserExtendedPermissions(User user,
                                           Project project) {
        roleModelRepository.createOrUpdateExtendedPermissions(UUID.randomUUID().toString(), user.getId(), project.getId());
        roleModelRepository.flush();
    }

    @TransactionMandatory
    public void deleteUserExtendedPermissions(User user,
                                              Project project) {
        roleModelRepository.deleteExtendedPermissionsByUserId(user.getId(), project.getId());
        roleModelRepository.flush();
        if (hasExtendedPermissionsForOtherProject(user, project))
            return;
        correctUserRole(user, Roles.POWER_USER.name());
    }

    @TransactionMandatory
    public void correctUserRole(User user,
                                String roleName) {
        roleModelRepository.deleteUserRolesByUserIdAndRoleName(user.getId(), roleName);
        roleModelRepository.flush();
    }

    private boolean hasExtendedPermissionsForOtherProject(User user,
                                                          Project project) {
        return user.getExtendedPermissions().stream()
                .map(ExtendedPermission::getProject)
                .anyMatch(pr -> !Objects.equals(pr.getId(), project.getId()));
    }

    @TransactionMandatory
    public void creatUserRoles(User user,
                               List<RoleModel> roles) {
        for (RoleModel role : roles) {
            roleModelRepository.createUserRole(user.getId(), role.getId());
        }
        roleModelRepository.flush();
    }

    @TransactionMandatory
    public List<RoleModel> getAndCheckRolesByIds(Collection<String> roleIds) throws NotFoundException {
        List<RoleModel> roles = roleModelRepository.findRolesByIdsIn(roleIds);
        checkExistingRoles(roles, roleIds);
        return roles;
    }

    private void checkExistingRoles(Collection<RoleModel> roles,
                                    Collection<String> roleIds) throws NotFoundException {
        Set<String> dbRoleIds = roles.stream().map(RoleModel::getId).collect(Collectors.toSet());
        for (String roleId : roleIds) {
            if (!dbRoleIds.contains(roleId))
                throw new NotFoundException(String.format("Не найдена роль с ИД %s", roleId));
        }
    }
}
