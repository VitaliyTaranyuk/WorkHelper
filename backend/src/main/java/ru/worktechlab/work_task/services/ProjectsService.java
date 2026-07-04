package ru.worktechlab.work_task.services;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.StringIdsDto;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.projects.*;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.ProjectMapper;
import ru.worktechlab.work_task.mappers.TaskMapper;
import ru.worktechlab.work_task.models.enums.ProjectStatus;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.enums.StatusName;
import ru.worktechlab.work_task.models.tables.*;
import ru.worktechlab.work_task.repositories.*;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectsService {

    private static final String DEFAULT_SPRINT_NAME = "Backlog";

    private final UsersProjectsRepository usersProjectsRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;
    private final UserContext userContext;
    private final TaskStatusRepository taskStatusRepository;
    private final ProjectMapper projectMapper;
    private final SprintsRepository sprintsRepository;
    private final CheckerUtil checkerUtil;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final RoleService roleService;

    @PersistenceContext
    private EntityManager entityManager;

    @TransactionRequired
    public List<ShortProjectDataDto> getAllUserProjects() {
        log.debug("Вывод всех проектов пользователя");
        String userId = userContext.getUserData().getUserId();
        User user = userService.findActiveUserById(userId);
        if (CollectionUtils.isEmpty(user.getProjects()))
            return Collections.emptyList();
        List<Project> visible = user.getProjects().stream()
                .filter(p -> p.getStatus() != ProjectStatus.DELETED)
                // стабильный порядок: JPA-коллекция без ORDER BY возвращает
                // проекты в случайном порядке — сайдбар «прыгал» между сессиями
                .sorted(java.util.Comparator.comparing(Project::getName,
                        String.CASE_INSENSITIVE_ORDER))
                .toList();
        return projectMapper.toShortDataDto(visible);
    }

    @TransactionRequired
    public String getLastProjectId() {
        log.debug("Получить id активного проекта");
        String userId = userContext.getUserData().getUserId();
        User user = userService.findActiveUserById(userId);
        return user.getLastProjectId();
    }

    @TransactionMandatory
    public Project findProjectById(String projectId) throws NotFoundException {
        return projectRepository.findById(projectId).orElseThrow(
                () -> new NotFoundException(String.format("Не найден проект с ИД - %s", projectId))
        );
    }

    @TransactionMandatory
    public Project findProjectByIdForUpdate(String projectId) throws NotFoundException {
        return projectRepository.findProjectByIdForUpdate(projectId).orElseThrow(
                () -> new NotFoundException(String.format("Не найден проект с ИД - %s", projectId))
        );
    }

    @TransactionRequired
    public ProjectDto createProject(ProjectRequestDto data) {
        String userId = userContext.getUserData().getUserId();
        User user = userService.findActiveUserById(userId);
        Project project = new Project(data.getName(), user, data.getDescription(), user, data.getCode());
        projectRepository.saveAndFlush(project);
        createDefaultStatuses(project);
        createDefaultSprint(user, project);
        usersProjectsRepository.saveAndFlush(new UsersProject(user, project));
        roleService.addUserRoles(user, Roles.PROJECT_OWNER);
        // Default statuses, sprint and membership were persisted through their own
        // repositories, so the managed `project` instance still holds empty collections.
        // Refresh it from the DB so the returned DTO contains the full graph (statuses, users).
        entityManager.refresh(project);
        return projectMapper.toProjectDto(project);
    }

    @TransactionMandatory
    public void createDefaultSprint(User user,
                                    Project project) {
        sprintsRepository.saveAndFlush(new Sprint(DEFAULT_SPRINT_NAME, user, project));
    }

    @TransactionMandatory
    public void createDefaultStatuses(Project project) {
        // code = description: единое отображаемое имя колонки.
        // Никаких "локализованных" словарей — пользователь видит исходное имя
        // как мы его задали при создании проекта. Дальнейшие переименования
        // переписывают именно это поле.
        // systemStatus=true: дефолтные колонки закреплены (ТП-32) — их нельзя
        // переставлять и удалять, только переименовывать.
        taskStatusRepository.saveAllAndFlush(Arrays.stream(StatusName.values())
                .map(status -> new TaskStatus(
                        status.getPriority(), status.getDescription(), status.getDescription(), status.isViewed(), status.isDefaultTaskStatus(), true, project)
                )
                .toList());
    }

    @TransactionRequired
    public ProjectDto getProjectData(String projectId) throws NotFoundException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, true);
        User user = data.getUser();
        user.setLastProjectId(projectId);
        userRepository.flush();
        return projectMapper.toProjectDto(data.getProject());
    }

    @TransactionRequired
    public ProjectDto finishProject(String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, true, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        data.getProject().finishProject(data.getUser());
        projectRepository.flush();
        Project project = findProjectById(projectId);
        return projectMapper.toProjectDto(project);
    }

    @TransactionRequired
    public ProjectDto startProject(String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, true, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        data.getProject().startProject();
        projectRepository.flush();
        Project project = findProjectById(projectId);
        return projectMapper.toProjectDto(project);
    }

    @TransactionRequired
    public ProjectDto archiveProject(String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, true, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        data.getProject().archive();
        projectRepository.flush();
        return projectMapper.toProjectDto(findProjectById(projectId));
    }

    @TransactionRequired
    public ApiResponse deleteProject(String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, true, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        // Мягкое удаление: статус DELETED. Аддитивно, не ломает связанные задачи/спринты.
        data.getProject().markDeleted();
        projectRepository.flush();
        log.info("Проект {} помечен удалённым пользователем {}", projectId, data.getUser().getId());
        return new ApiResponse("Проект удалён");
    }

    private boolean hasProject(User user, String projectId) {
        return user.getProjects().stream()
                .anyMatch(project -> Objects.equals(project.getId(), projectId));
    }

    @TransactionRequired
    public void addProjectForUsers(String projectId,
                                   StringIdsDto request) throws NotFoundException, BadRequestException {
        if (request == null || CollectionUtils.isEmpty(request.getIds()))
            return;
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        Project project = data.getProject();
        checkerUtil.checkProjectOwner(project, data.getUser());
        List<User> users = userService.findAndCheckUsers(request.getIds());
        usersProjectsRepository.saveAllAndFlush(users.stream()
                .filter(user -> !hasProject(user, project.getId()))
                .map(user -> new UsersProject(user, project))
                .toList());
    }

    @TransactionRequired
    public void deleteProjectForUsers(String projectId,
                                      StringIdsDto request) throws NotFoundException, BadRequestException {
        if (request == null || CollectionUtils.isEmpty(request.getIds()))
            return;
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        userService.findAndCheckUsers(request.getIds());
        usersProjectsRepository.deleteProjectForUsers(projectId, request.getIds());
        usersProjectsRepository.flush();
    }

    @TransactionRequired
    public ProjectDataDto getProjectDataByFilter(String projectId,
                                                 ProjectDataFilterDto filter) throws NotFoundException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, true);
        User user = data.getUser();
        user.setLastProjectId(projectId);
        projectRepository.flush();
        List<User> users = userRepository.findProjectUsers(filter.getUserIds(), data.getProject());
        Map<String, List<TaskModel>> tasksByUserId = taskRepository.findTaskByUsers(data.getProject(), users, filter.getStatusIds()).stream()
                .collect(Collectors.groupingBy(task -> task.getAssignee().getId()));
        List<UserWithTasksDto> userData = users.stream()
                .map(u -> toUserWithTasks(u, tasksByUserId.get(u.getId())))
                .toList();
        ProjectDataDto response = new ProjectDataDto();
        response.setUsers(userData);
        return response;
    }

    private UserWithTasksDto toUserWithTasks(User user,
                                             List<TaskModel> dbTasks) {
        List<TaskDataDto> tasks = CollectionUtils.isEmpty(dbTasks) ? Collections.emptyList()
                : dbTasks.stream()
                .map(taskMapper::toDo)
                .toList();
        return new UserWithTasksDto(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getGender().name(), tasks);
    }

    @TransactionRequired
    public void addProjectOwner(String projectId,
                                String userId) throws NotFoundException {
        Project project = findProjectByIdForUpdate(projectId);
        User owner = userService.findActiveUserById(userId);
        project.setProjectOwner(owner);
        roleService.addUserRoles(owner, Roles.PROJECT_OWNER);
        if (!hasProject(owner, projectId))
            usersProjectsRepository.save(new UsersProject(owner, project));
        projectRepository.flush();
    }

    @TransactionRequired
    public void addExtendedPermissionsForUserProject(String projectId,
                                                     String userId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        User userForUpdatePermissions = userService.findActiveUserById(userId);
        roleService.addUserRoles(userForUpdatePermissions, Roles.POWER_USER);
        roleService.addUserExtendedPermissions(userForUpdatePermissions, data.getProject());
        if (!hasProject(userForUpdatePermissions, projectId))
            usersProjectsRepository.save(new UsersProject(userForUpdatePermissions, data.getProject()));
        projectRepository.flush();
    }

    @TransactionRequired
    public void deleteExtendedPermissionsForUserProject(String projectId,
                                                        String userId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        User userForUpdatePermissions = userService.findActiveUserById(userId);
        roleService.deleteUserExtendedPermissions(userForUpdatePermissions, data.getProject());
        projectRepository.flush();
    }

    @TransactionRequired
    public ProjectDto editProject(String projectId,
                                  EditProjectRequestDto data) throws NotFoundException, BadRequestException {
        Project project = checkerUtil.findAndCheckProjectForOwner(projectId);
        // ТП-68: имя/описание/код можно менять у живого проекта (DRAFT/ACTIVE) —
        // как в зрелых TMS; запрет остаётся для завершённых/архивных/удалённых.
        if (project.getStatus() != ProjectStatus.DRAFT && project.getStatus() != ProjectStatus.ACTIVE)
            throw new BadRequestException(String.format("Проект имеет статус - %s, при котором изменение данных недоступно",
                    project.getStatus().getDescription()));
        project.setMainData(data.getName(), data.getDescription(), data.getCode());
        projectRepository.flush();
        return projectMapper.toProjectDto(findProjectById(projectId));
    }
}
