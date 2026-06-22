package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.sprints.SprintDtoRequest;
import ru.worktechlab.work_task.dto.sprints.SprintInfoDTO;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.SprintMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.repositories.SprintsRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class SprintsService {
    private final SprintsRepository sprintsRepository;
    private final SprintMapper sprintMapper;
    private final CheckerUtil checkerUtil;
    private final TaskRepository taskRepository;

    @TransactionRequired
    public SprintInfoDTO getActiveSprint(String projectId) throws NotFoundException {
        log.debug("Вывод информации о спринте");
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        Project project = data.getProject();
        Sprint sprint = sprintsRepository.getSprintInfoByProjectId(project);
        if (sprint == null)
            throw new NotFoundException(String.format(
                    "Не найден активный спринт для проекта %s", project.getName()
            ));
        return sprintMapper.toSprintInfoDto(sprint);
    }

    @TransactionRequired
    public SprintInfoDTO createSprint(String projectId,
                                      SprintDtoRequest request) throws NotFoundException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = sprintsRepository.saveAndFlush(new Sprint(
                request.getName(), request.getGoal(), request.getStartDate(), request.getEndDate(), data.getUser(), data.getProject()
        ));
        Sprint dbSprint = findSprintById(sprint.getId());
        return sprintMapper.toSprintInfoDto(dbSprint);
    }

    @TransactionMandatory
    public Sprint findSprintById(String sprintId) throws NotFoundException {
        return sprintsRepository.findById(sprintId).orElseThrow(
                () -> new NotFoundException(String.format("Не найден спринт с ИД - %s", sprintId))
        );
    }

    @TransactionRequired
    public SprintInfoDTO activateSprint(String sprintId,
                                        String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = findSprintByIdForUpdate(sprintId, data.getProject());
        checkHasActiveSprint(sprint);
        sprint.activate();
        sprintsRepository.flush();
        Sprint dbSprint = findSprintById(sprint.getId());
        return sprintMapper.toSprintInfoDto(dbSprint);
    }

    @TransactionRequired
    public SprintInfoDTO finishSprint(String sprintId,
                                      String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = findSprintByIdForUpdate(sprintId, data.getProject());
        sprint.finish(data.getUser());
        sprintsRepository.flush();
        Sprint dbSprint = findSprintById(sprint.getId());
        return sprintMapper.toSprintInfoDto(dbSprint);
    }

    @TransactionMandatory
    public void checkHasActiveSprint(Sprint sprint) throws BadRequestException {
        if (sprint.isActive())
            return;
        boolean hasActiveSprint = sprintsRepository.hasActiveSprint(sprint.getProject().getId());
        if (hasActiveSprint)
            throw new BadRequestException(String.format("У проекта %s есть незавершенный спринт", sprint.getProject().getName()));
    }

    @TransactionMandatory
    public Sprint findSprintByIdForUpdate(String sprintId,
                                          Project project) throws NotFoundException {
        return sprintsRepository.findSprintByIdForUpdate(sprintId, project.getId()).orElseThrow(
                () -> new NotFoundException(String.format("Для проекта %s не найден спринт с ИД - %s", project.getName(), sprintId))
        );
    }

    @TransactionMandatory
    public Sprint findSprintByIdAndProject(String sprintId,
                                           Project project) throws NotFoundException {
        return sprintsRepository.findSprintByIdAndProject(sprintId, project).orElseThrow(
                () -> new NotFoundException(String.format("Для проекта %s не найден спринт с ИД - %s", project.getName(), sprintId))
        );
    }

    /**
     * Resolves the sprint a task should belong to. When the caller does not specify a
     * sprint (sprintId is null/blank), the task falls back to the project's default
     * "Backlog" sprint instead of failing — standard TMS behaviour.
     */
    @TransactionMandatory
    public Sprint resolveSprintForTask(String sprintId,
                                       Project project) throws NotFoundException {
        if (sprintId == null || sprintId.isBlank())
            return sprintsRepository.findDefaultSprintByProject(project).orElseThrow(
                    () -> new NotFoundException(String.format("Для проекта %s не найден дефолтный спринт", project.getName()))
            );
        return findSprintByIdAndProject(sprintId, project);
    }

    @TransactionRequired
    public SprintInfoDTO updateSprint(String sprintId,
                                      String projectId,
                                      SprintDtoRequest requestData) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = findSprintByIdForUpdate(sprintId, data.getProject());
        sprint.setName(requestData.getName());
        sprint.setStartDate(requestData.getStartDate());
        sprint.setEndDate(requestData.getEndDate());
        sprintsRepository.flush();
        Sprint dbSprint = findSprintById(sprint.getId());
        return sprintMapper.toSprintInfoDto(dbSprint);
    }

    @TransactionRequired
    public SprintInfoDTO archiveSprint(String sprintId,
                                       String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = findSprintByIdForUpdate(sprintId, data.getProject());
        if (sprint.isDefaultSprint())
            throw new BadRequestException("Backlog-спринт нельзя архивировать");
        sprint.archive();
        sprintsRepository.flush();
        return sprintMapper.toSprintInfoDto(findSprintById(sprint.getId()));
    }

    @TransactionRequired
    public ApiResponse deleteSprint(String sprintId,
                                    String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkExtendedPermission(data.getUser(), data.getProject());
        Sprint sprint = findSprintByIdForUpdate(sprintId, data.getProject());
        if (sprint.isDefaultSprint())
            throw new BadRequestException("Backlog-спринт нельзя удалить");
        // Trello/Jira UX: задачи удаляемого спринта переносятся в Backlog, не теряются.
        Sprint backlog = sprintsRepository.findDefaultSprintByProject(data.getProject()).orElseThrow(
                () -> new NotFoundException(String.format("Для проекта %s не найден Backlog-спринт", data.getProject().getName()))
        );
        List<TaskModel> tasks = taskRepository.findAllBySprint(sprint);
        tasks.forEach(task -> {
            task.setSprint(backlog);
            task.touch();
        });
        taskRepository.flush();
        sprintsRepository.delete(sprint);
        sprintsRepository.flush();
        log.info("Спринт {} удалён, перенесено задач в Backlog: {}", sprintId, tasks.size());
        return new ApiResponse(String.format("Спринт удалён, задач перенесено в Backlog: %d", tasks.size()));
    }
}