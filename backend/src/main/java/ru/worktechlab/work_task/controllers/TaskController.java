package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.response_dto.UsersTasksInProjectDTO;
import ru.worktechlab.work_task.dto.task_comment.AllTasksCommentsResponseDto;
import ru.worktechlab.work_task.dto.task_comment.CommentDto;
import ru.worktechlab.work_task.dto.task_comment.CommentResponseDto;
import ru.worktechlab.work_task.dto.task_comment.UpdateCommentDto;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryResponseDto;
import ru.worktechlab.work_task.dto.task_link.LinkDto;
import ru.worktechlab.work_task.dto.task_link.LinkResponseDto;
import ru.worktechlab.work_task.dto.tasks.BulkTaskRequestDTO;
import ru.worktechlab.work_task.dto.tasks.ReorderColumnDTO;
import ru.worktechlab.work_task.dto.tasks.ReorderSprintDTO;
import ru.worktechlab.work_task.dto.tasks.TaskDataDto;
import ru.worktechlab.work_task.dto.tasks.TaskModelDTO;
import ru.worktechlab.work_task.dto.tasks.UpdateStatusRequestDTO;
import ru.worktechlab.work_task.dto.tasks.UpdateTaskModelDTO;
import ru.worktechlab.work_task.dto.tasks.UpdateTasksSprintRequestDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.TaskHistoryService;
import ru.worktechlab.work_task.services.TaskService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("work-task/api/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Task", description = "Управление задачами")
public class TaskController {
    private final TaskService taskService;
    private final TaskHistoryService taskHistoryService;

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/create")
    @Operation(summary = "Создать задачу")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDataDto createTask(
            @Valid
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Данные для создания задачи",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = TaskModelDTO.class)
                    )
            )
            @RequestBody TaskModelDTO taskModelDTO) throws NotFoundException {
        return taskService.createTask(taskModelDTO);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/{projectId}/{taskId}/update")
    @Operation(summary = "Обновить задачу")
    public TaskDataDto updateTask(
            @Parameter(description = "Уникальный идентификатор задачи",
                    example = "96cd710c-bd28-40b7-903e-4b8033892612",
                    required = true)
            @PathVariable("taskId") String taskId,
            @Parameter(description = "ИД проекта",
                    example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540",
                    required = true)
            @PathVariable("projectId") String projectId,
            @Valid
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Данные для обновления задачи",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = UpdateTaskModelDTO.class)
                    )
            )
            @RequestBody UpdateTaskModelDTO updateTaskModelDTO) throws NotFoundException {
        return taskService.updateTask(projectId, taskId, updateTaskModelDTO);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/update-status")
    @Operation(summary = "Обновить статус задачи")
    public TaskDataDto updateTaskStatus(
            @Valid
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Данные для обновления статуса задачи",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = UpdateStatusRequestDTO.class)
                    )
            )
            @RequestBody UpdateStatusRequestDTO requestDto) throws NotFoundException {
        return taskService.updateTaskStatus(requestDto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/tasks-in-project")
    @Operation(summary = "Получить все задачи активного проекта отсортированные по пользователям")
    public List<UsersTasksInProjectDTO> getTasksInProject() throws NotFoundException {
        return taskService.getProjectTaskByUserGuid();
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/{taskId}/history")
    @Operation(summary = "Получить историю изменения задачи по id {taskId}")
    public List<TaskHistoryResponseDto> getTaskHistory(
            @Parameter(description = "Уникальный идентификатор задачи",
                    example = "96cd710c-bd28-40b7-903e-4b8033892612",
                    required = true)
            @PathVariable("taskId") String taskId,
            @Parameter(description = "ИД проекта",
                    example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540",
                    required = true)
            @PathVariable("projectId") String projectId) throws NotFoundException {
        return taskHistoryService.getTaskHistoryById(taskId, projectId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/create-comment")
    @Operation(summary = "Создать комментарий")
    public CommentResponseDto createComment(@Valid
                                            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                                                    description = "Данные комментария",
                                                    content = @Content(
                                                            mediaType = "application/json",
                                                            schema = @Schema(implementation = CommentDto.class)
                                                    )
                                            )
                                            @RequestBody CommentDto commentDto) throws NotFoundException {
        return taskService.createComment(commentDto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/update-comment")
    @Operation(summary = "Обновить комментарий")
    public CommentResponseDto updateComment(@Valid
                                            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                                                    description = "Данные комментария",
                                                    content = @Content(
                                                            mediaType = "application/json",
                                                            schema = @Schema(implementation = UpdateCommentDto.class)
                                                    )
                                            )
                                            @RequestBody UpdateCommentDto dto) throws NotFoundException {
        return taskService.updateComment(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @DeleteMapping("/{commentId}/{taskId}/{projectId}/delete-comment")
    @Operation(summary = "Удаление комментария")
    public ApiResponse deleteComment(
            @Parameter(description = "ИД комментария", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String commentId,
            @Parameter(description = "Уникальный идентификатор задачи",
                    example = "96cd710c-bd28-40b7-903e-4b8033892612",
                    required = true)
            @PathVariable("taskId") String taskId,
            @Parameter(description = "ИД проекта",
                    example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540",
                    required = true)
            @PathVariable("projectId") String projectId
    ) throws NotFoundException {
        return taskService.deleteComment(commentId, taskId, projectId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{taskId}/{projectId}/comments")
    @Operation(summary = "Получить все комментарии к задаче")
    public List<AllTasksCommentsResponseDto> allTasksComments(@PathVariable("taskId") String taskId,
                                                              @Parameter(description = "ИД проекта",
                                                                      example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540",
                                                                      required = true)
                                                              @PathVariable("projectId") String projectId) throws NotFoundException {
        return taskService.allTasksComments(taskId, projectId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/create-link")
    @Operation(summary = "Создать связь между задачами")
    public LinkResponseDto linkTask(
            @Valid
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Модель связывания задач",
                    content = @Content(
                            mediaType = "application/json", schema = @Schema(implementation = LinkDto.class)
                    )
            )
            @RequestBody LinkDto dto
    ) throws NotFoundException {
        return taskService.linkTask(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{taskId}/{projectId}/links")
    @Operation(summary = "Вывод всех связей задачи")
    public List<LinkResponseDto> allTasksLinks(
            @PathVariable("taskId") String taskId,
            @Parameter(description = "ИД проекта",
                    example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540",
                    required = true)
            @PathVariable("projectId") String projectId
    ) throws NotFoundException {
        return taskService.allTasksLinks(taskId, projectId);
    }

    // ===== Simplified Kanban: lifecycle, bulk, my tasks =====

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @DeleteMapping("/{projectId}/links/{linkId}")
    @Operation(summary = "Удалить связь между задачами")
    public ApiResponse deleteLink(@PathVariable String projectId,
                                  @PathVariable String linkId) throws NotFoundException {
        return taskService.deleteLink(projectId, linkId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/{projectId}/{taskId}/archive")
    @Operation(summary = "Архивировать задачу")
    public TaskDataDto archiveTask(@PathVariable String projectId,
                                   @PathVariable String taskId) throws NotFoundException {
        return taskService.archiveTask(projectId, taskId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/{projectId}/{taskId}/restore")
    @Operation(summary = "Восстановить задачу из архива")
    public TaskDataDto restoreTask(@PathVariable String projectId,
                                   @PathVariable String taskId) throws NotFoundException {
        return taskService.restoreTask(projectId, taskId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @DeleteMapping("/{projectId}/{taskId}")
    @Operation(summary = "Удалить задачу")
    public ApiResponse deleteTask(@PathVariable String projectId,
                                  @PathVariable String taskId) throws NotFoundException {
        return taskService.deleteTask(projectId, taskId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/bulk/archive")
    @Operation(summary = "Массовое архивирование задач")
    public ApiResponse bulkArchive(@Valid @RequestBody BulkTaskRequestDTO dto) throws NotFoundException {
        return taskService.bulkArchive(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/bulk/delete")
    @Operation(summary = "Массовое удаление задач")
    public ApiResponse bulkDelete(@Valid @RequestBody BulkTaskRequestDTO dto) throws NotFoundException {
        return taskService.bulkDelete(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/bulk/move-status")
    @Operation(summary = "Массовое перемещение задач между колонками")
    public ApiResponse bulkMoveStatus(@Valid @RequestBody BulkTaskRequestDTO dto) throws NotFoundException {
        return taskService.bulkMoveStatus(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/bulk/move-project")
    @Operation(summary = "Массовое перемещение задач между проектами")
    public ApiResponse bulkMoveProject(@Valid @RequestBody BulkTaskRequestDTO dto) throws NotFoundException {
        return taskService.bulkMoveProject(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/bulk/move-sprint")
    @Operation(summary = "Массовое перемещение задач между спринтами")
    public ApiResponse bulkMoveSprint(@Valid @RequestBody BulkTaskRequestDTO dto) throws NotFoundException {
        return taskService.bulkMoveSprint(dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/{projectId}/reorder")
    @Operation(summary = "Переупорядочить задачи в колонке (drag-and-drop)")
    public ApiResponse reorderColumn(@PathVariable String projectId,
                                     @Valid @RequestBody ReorderColumnDTO dto) throws NotFoundException {
        return taskService.reorderColumn(projectId, dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/{projectId}/reorder-sprint")
    @Operation(summary = "Перенести задачу в спринт с сохранением позиции (drag-and-drop в списке задач)")
    public ApiResponse reorderSprint(@PathVariable String projectId,
                                     @Valid @RequestBody ReorderSprintDTO dto) throws NotFoundException {
        return taskService.reorderSprint(projectId, dto);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/{taskId}/dev-info")
    @Operation(summary = "Панель «Разработка»: ветки и PR GitHub, связанные с задачей")
    public ru.worktechlab.work_task.dto.devpanel.DevInfoDto getDevInfo(
            @PathVariable String projectId,
            @PathVariable String taskId) throws NotFoundException {
        return taskService.getDevInfo(projectId, taskId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/my")
    @Operation(summary = "Мои задачи в проекте (фильтр My Tasks)")
    public List<TaskDataDto> getMyTasks(@PathVariable String projectId) throws NotFoundException {
        return taskService.getMyTasks(projectId);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/code/{code}")
    @Operation(summary = "Получить задачу по человекочитаемому коду (Jira-style task lookup)")
    public TaskDataDto getTaskByCode(@PathVariable String projectId,
                                     @PathVariable String code) throws NotFoundException {
        return taskService.getTaskByCode(projectId, code);
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PutMapping("/update-sprint")
    @Operation(summary = "Перенести задачи между спринтами (wrapper над /bulk/move-sprint)")
    public ApiResponse updateTasksSprint(@Valid @RequestBody UpdateTasksSprintRequestDto dto) throws NotFoundException {
        return taskService.bulkMoveSprint(dto.toBulkRequest());
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/completed")
    @Operation(summary = "Завершённые задачи проекта (ушли с активной доски)")
    public List<TaskDataDto> getCompletedTasks(@PathVariable String projectId) throws NotFoundException {
        return taskService.getCompletedTasks(projectId);
    }
}