package ru.worktechlab.work_task.utils;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.exceptions.PermissionDeniedException;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.ExtendedPermission;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.ProjectRepository;
import ru.worktechlab.work_task.repositories.UserRepository;

import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckerUtil {

    private final UserContext userContext;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @TransactionMandatory
    public UserAndProjectData findAndCheckProjectUserData(String projectId,
                                                          boolean projectForUpdate,
                                                          boolean userForUpdate) throws NotFoundException {
        Project project = findProject(projectId, projectForUpdate);
        String userId = userContext.getUserData().getUserId();
        User user = findUser(userId, userForUpdate);
        checkHasProjectForUser(user, project);
        return new UserAndProjectData(project, user);
    }

    @TransactionMandatory
    public User findAndCheckActiveUser(String userId,
                                       Project project) throws NotFoundException {
        User user = findActiveUser(userId);
        checkHasProjectForUser(user, project);
        return user;
    }

    private void checkHasProjectForUser(User user,
                                        Project project) throws NotFoundException {
        boolean hasProject = user.getProjects().stream()
                .anyMatch(pr -> Objects.equals(project.getId(), pr.getId()));
        if (!hasProject)
            throw new NotFoundException(
                    String.format("Вам не доступен проект %s", project.getName())
            );
    }

    @TransactionMandatory
    public Project findProject(String projectId,
                               boolean projectForUpdate) throws NotFoundException {
        if (projectForUpdate)
            return projectRepository.findProjectByIdForUpdate(projectId).orElseThrow(
                    () -> new NotFoundException(String.format("Не найден проект с ИД - %s", projectId))
            );
        return projectRepository.findById(projectId).orElseThrow(
                () -> new NotFoundException(String.format("Не найден проект с ИД - %s", projectId))
        );
    }

    @TransactionMandatory
    public User findUser(String userId,
                         boolean userForUpdate) {
        if (userForUpdate)
            return userRepository.findActiveUserByIdForUpdate(userId)
                    .orElseThrow(() -> new UsernameNotFoundException(
                            String.format("Пользователь с ИД %s не найден или не активен", userId)));
        return findActiveUser(userId);
    }

    @TransactionMandatory
    public User findActiveUser(String userId) {
        return userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new UsernameNotFoundException(
                        String.format("Пользователь с ИД %s не найден или не активен", userId)));
    }

    public void checkProjectOwner(Project project,
                                  User user) throws BadRequestException {
        if (!Objects.equals(project.getOwner().getId(), user.getId()))
            throw new BadRequestException(String.format("Вы не являетесь руководителем проекта %s", project.getName()));
    }

    public void checkExtendedPermission(User user,
                                        Project project) {
        Set<Roles> existingRoles = user.getRoles().stream().map(RoleModel::getName).collect(Collectors.toSet());
        if (isOwner(user, project, existingRoles))
            return;
        if (isExtendedPermission(user, project, existingRoles))
            return;
        throw new PermissionDeniedException(String.format("Ува нет данных полномочий для проекта %s", project.getName()));
    }

    private boolean isExtendedPermission(User user,
                                         Project project,
                                         Set<Roles> roles) {
        if (!roles.contains(Roles.POWER_USER))
            return false;
        return user.getExtendedPermissions().stream()
                .map(ExtendedPermission::getProject)
                .anyMatch(pr -> Objects.equals(pr.getId(), project.getId()));
    }

    private boolean isOwner(User user,
                            Project project,
                            Set<Roles> roles) {
        if (!roles.contains(Roles.PROJECT_OWNER))
            return false;
        return Objects.equals(project.getOwner().getId(), user.getId());
    }

    @TransactionMandatory
    public Project findAndCheckProjectForOwner(String projectId) throws NotFoundException, BadRequestException {
        Project project = findProject(projectId, true);
        User user = findUser(userContext.getUserData().getUserId(), false);
        checkProjectOwner(project, user);
        return project;
    }
}
