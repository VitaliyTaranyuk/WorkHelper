package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.statuses.*;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.TaskStatusMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.repositories.TaskStatusRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Slf4j
@RequiredArgsConstructor
public class TaskStatusService {

    private final TaskStatusRepository taskStatusRepository;
    private final TaskStatusMapper taskStatusMapper;
    private final CheckerUtil checkerUtil;
    private final TaskRepository taskRepository;
    private final ProjectHistoryService projectHistoryService;

    @TransactionRequired
    public StatusListResponseDto getStatuses(String projectId) throws NotFoundException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        StatusListResponseDto response = new StatusListResponseDto(projectId);
        response.setStatuses(data.getProject().getStatuses().stream()
                .map(taskStatusMapper::todo)
                .toList());
        return response;
    }

    @TransactionRequired
    public TaskStatusDto createStatus(String projectId,
                                      CreateTaskStatusDto requestData) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        TaskStatus status = taskStatusRepository.saveAndFlush(new TaskStatus(
                requestData.getPriority(), requestData.getCode(), requestData.getDescription(), requestData.getViewed(), requestData.isDefaultTaskStatus(), data.getProject()
        ));
        projectHistoryService.record(projectId, ProjectHistoryService.COLUMN_CREATE, null, status.getCode(), data.getUser());
        return taskStatusMapper.todo(status);
    }

    @TransactionRequired
    public StatusListResponseDto updateStatuses(String projectId,
                                                UpdateRequestStatusesDto requestStatusesDto) throws NotFoundException, BadRequestException {
        if (CollectionUtils.isEmpty(requestStatusesDto.getStatuses()))
            return null;
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        Project project = data.getProject();
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        checkHasDefaultValue(project, requestStatusesDto.getStatuses());
        for (TaskStatusRequestDto status : requestStatusesDto.getStatuses()) {
            TaskStatus dbStatus = findStatusByIdAndProjectForUpdate(status.getId(), project);
            String oldCode = dbStatus.getCode();
            if (oldCode != null && !oldCode.equals(status.getCode()))
                projectHistoryService.record(projectId, ProjectHistoryService.COLUMN_RENAME, oldCode, status.getCode(), data.getUser());
            dbStatus.setPriority(status.getPriority());
            dbStatus.setDescription(status.getDescription());
            dbStatus.setCode(status.getCode());
            dbStatus.setViewed(status.getViewed());
            dbStatus.setDefaultTaskStatus(status.isDefaultTaskStatus());
        }
        taskStatusRepository.flush();
        StatusListResponseDto response = new StatusListResponseDto(projectId);
        response.setStatuses(taskStatusRepository.findStatusesByProject(project).stream()
                .map(taskStatusMapper::todo)
                .toList());
        return response;
    }

    @TransactionMandatory
    public void checkHasDefaultValue(Project project,
                                     List<TaskStatusRequestDto> statuses) throws BadRequestException {
        if (CollectionUtils.isEmpty(statuses))
            return;
        Set<Long> taskStatusIds = statuses.stream()
                .map(TaskStatusRequestDto::getId)
                .collect(Collectors.toSet());
        List<TaskStatus> dbStatuses = taskStatusRepository.findByProjectAndIdsNotIn(project, taskStatusIds);
        long countDefaultStatus = Stream.concat(
                statuses.stream().filter(TaskStatusRequestDto::isDefaultTaskStatus).map(TaskStatusRequestDto::isDefaultTaskStatus),
                dbStatuses.stream().filter(TaskStatus::isDefaultTaskStatus).map(TaskStatus::isDefaultTaskStatus)
        ).count();
        if (countDefaultStatus == 0)
            throw new BadRequestException(String.format("У проекта %s не назначен статус по умолчанию", project.getName()));
        if (countDefaultStatus > 1)
            throw new BadRequestException(String.format("У проекта %s назначено несколько статусов по умолчанию", project.getName()));
    }

    @TransactionRequired
    public ApiResponse deleteStatus(String projectId,
                                    long statusId) throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        TaskStatus status = findStatusByIdAndProjectForUpdate(statusId, data.getProject());
        if (status.isDefaultTaskStatus())
            throw new BadRequestException("Колонку по умолчанию нельзя удалить");
        TaskStatus defaultStatus = data.getProject().getStatuses().stream()
                .filter(TaskStatus::isDefaultTaskStatus)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(String.format("Для проекта %s не найдена колонка по умолчанию", data.getProject().getName())));
        // Trello UX: задачи удаляемой колонки переносятся в колонку по умолчанию, не теряются.
        List<TaskModel> tasks = taskRepository.findAllByStatus(status);
        tasks.forEach(task -> {
            task.setStatus(defaultStatus);
            task.touch();
        });
        taskRepository.flush();
        projectHistoryService.record(projectId, ProjectHistoryService.COLUMN_DELETE, status.getCode(), null, data.getUser());
        taskStatusRepository.delete(status);
        taskStatusRepository.flush();
        log.info("Колонка {} удалена, перенесено задач: {}", statusId, tasks.size());
        return new ApiResponse(String.format("Колонка удалена, задач перенесено: %d", tasks.size()));
    }

    @TransactionMandatory
    public TaskStatus findStatusById(long statusId) throws NotFoundException {
        return taskStatusRepository.findById(statusId).orElseThrow(
                () -> new NotFoundException(String.format("Не найден статус с ИД - %s", statusId))
        );
    }

    @TransactionMandatory
    public TaskStatus findStatusByIdAndProjectForUpdate(long statusId,
                                                        Project project) throws NotFoundException {
        return taskStatusRepository.findStatusByProjectAndIdForUpdate(project.getId(), statusId).orElseThrow(
                () -> new NotFoundException(String.format("Не найдена задача для проекта %s с ИД - %s", project.getName(), statusId))
        );
    }

    @TransactionMandatory
    public TaskStatus findStatusByIdAndProject(long statusId,
                                               Project project) throws NotFoundException {
        return taskStatusRepository.findStatusByProjectAndId(project, statusId).orElseThrow(
                () -> new NotFoundException(String.format("Не найдена задача для проекта %s с ИД - %s", project.getName(), statusId))
        );
    }
}
