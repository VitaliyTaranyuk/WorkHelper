package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.task_comment.UpdateCommentDto;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.dto.tasks.UpdateStatusRequestDTO;
import ru.worktechlab.work_task.dto.tasks.UpdateTaskModelDTO;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.TaskHistoryMapper;
import ru.worktechlab.work_task.models.tables.*;
import ru.worktechlab.work_task.repositories.TaskHistoryRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskHistoryService {

    private final TaskHistoryRepository repository;
    private final TaskHistoryMapper taskHistoryMapper;
    private final SprintsService sprintsService;
    private final TaskStatusService taskStatusService;
    private final CheckerUtil checkerUtil;
    private final TaskPlacementService taskPlacementService;

    public void saveTaskModelChanges(TaskModel oldTask,
                                     UpdateTaskModelDTO dto,
                                     Project project,
                                     User user) throws NotFoundException {
        saveHistory(createTaskHistory(oldTask, dto, project), oldTask.getId(), user);
    }

    public void saveTaskModelChanges(TaskModel oldTask,
                                     UpdateStatusRequestDTO dto,
                                     Project project,
                                     User user) throws NotFoundException {
        saveHistory(createTaskStatusHistory(oldTask, dto, project), oldTask.getId(), user);
    }

    public void saveTaskCommentChanges(Comment comment,
                                       UpdateCommentDto dto,
                                       User user,
                                       TaskModel task
    ) {
        saveHistory(createTaskCommentHistory(comment, dto), task, user);

    }

    private void saveHistory(List<TaskHistoryDto> dto,
                             String taskId,
                             User user) {
        if (CollectionUtils.isEmpty(dto)) return;
        List<TaskHistory> histories = convertToEntity(dto, user, taskId);
        saveAll(histories);
    }

    private void saveHistory(List<TaskHistoryDto> dto,
                             TaskModel task,
                             User user) {
        if (CollectionUtils.isEmpty(dto)) return;
        List<TaskHistory> histories = convertToEntity(dto, user, task.getId());
        saveAll(histories);
    }

    private void saveAll(List<TaskHistory> history) {
        if (CollectionUtils.isEmpty(history)) return;
        repository.saveAllAndFlush(history);
    }

    private List<TaskHistoryDto> createTaskHistory(TaskModel oldTask,
                                                   UpdateTaskModelDTO dto,
                                                   Project project) throws NotFoundException {
        oldTask.setTitle(dto.getTitle());
        oldTask.setPriority(dto.getPriority());
        if (dto.getAssignee() != null) {
            User assignee = checkerUtil.findAndCheckActiveUser(dto.getAssignee(), project);
            oldTask.setAssignee(assignee);
        }
        oldTask.setDescription(dto.getDescription());
        oldTask.setTaskType(dto.getTaskType());
        oldTask.setEstimation(dto.getEstimation());
        applySprintAndStatus(oldTask, dto, project);
        return oldTask.getChanges();
    }

    /**
     * Применяет спринт/статус из DTO, поддерживая инвариант «Backlog-спринт ⟺
     * Backlog-статус» (см. TaskPlacementService). Изменения проходят через
     * сеттеры TaskModel и потому попадают в историю задачи.
     */
    private void applySprintAndStatus(TaskModel task,
                                      UpdateTaskModelDTO dto,
                                      Project project) throws NotFoundException {
        Sprint targetSprint = dto.getSprintId() != null
                ? sprintsService.findSprintByIdAndProject(dto.getSprintId(), project)
                : null;
        TaskStatus targetStatus = dto.getStatus() != null
                ? taskStatusService.findStatusByIdAndProject(dto.getStatus(), project)
                : null;
        boolean sprintChanged = targetSprint != null && !targetSprint.getId().equals(task.getSprint().getId());
        boolean statusChanged = targetStatus != null && targetStatus.getId() != task.getStatus().getId();

        if (sprintChanged && statusChanged) {
            // Оба поля заданы явно: применяем как есть, но не допускаем «невидимую»
            // комбинацию (обычный спринт + Backlog-статус).
            task.setSprint(targetSprint);
            task.setStatus(targetStatus);
            if (!targetSprint.isDefaultSprint() && targetStatus.isDefaultTaskStatus())
                task.setStatus(taskPlacementService.firstBoardStatus(project));
        } else if (sprintChanged) {
            taskPlacementService.placeInSprint(task, targetSprint, project);
        } else if (statusChanged) {
            taskPlacementService.applyStatusChange(task, targetStatus, project);
        }
    }

    private List<TaskHistoryDto> createTaskStatusHistory(TaskModel oldTask,
                                                         UpdateStatusRequestDTO dto,
                                                         Project project) throws NotFoundException {
        TaskStatus status = taskStatusService.findStatusByIdAndProject(dto.getStatus(), project);
        taskPlacementService.applyStatusChange(oldTask, status, project);
        return oldTask.getChanges();
    }

    private List<TaskHistoryDto> createTaskCommentHistory(Comment comment, UpdateCommentDto dto) {
        comment.setComment(dto.getComment());
        comment.setUpdatedAt(LocalDateTime.now());
        return comment.getChanges();
    }

    private List<TaskHistory> convertToEntity(List<TaskHistoryDto> dtos, User user, String taskId) {
        if (CollectionUtils.isEmpty(dtos)) {
            return java.util.Collections.emptyList();
        }
        return dtos.stream()
                .map(dto -> new TaskHistory(taskId,
                        dto.getFieldName(),
                        dto.getInitialValue(),
                        dto.getNewValue(),
                        user)
                )
                .toList();
    }

    @TransactionRequired
    public List<TaskHistoryResponseDto> getTaskHistoryById(String taskId, String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        List<TaskHistory> taskHistories = repository.findAllByTaskIdOrderByCreatedAtAsc(taskId);
        return taskHistoryMapper.convertToDto(taskHistories);
    }
}
