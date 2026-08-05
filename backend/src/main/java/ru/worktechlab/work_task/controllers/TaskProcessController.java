package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.rules.TaskProcessDto;
import ru.worktechlab.work_task.dto.rules.TaskProcessStepRequestDto;
import ru.worktechlab.work_task.dto.rules.TaskSizeRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.TaskProcessService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

/**
 * T-516: размер задачи и её место в процессе проекта.
 *
 * <p>Отдельный контроллер, а не ещё несколько методов в {@code TaskController}: тот и без
 * того самый крупный в проекте, а здесь другая ответственность — не карточка задачи, а её
 * прохождение по процессу.
 *
 * <p>Права — участник проекта: это работа над задачей, а не настройка проекта. Настройку
 * процесса (какие этапы вообще есть и с какого размера обязательны) меняет владелец —
 * {@code ProcessStepController}.
 */
@RestController
@RequestMapping("work-task/api/v1/task-process")
@RequiredArgsConstructor
@Tag(name = "TaskProcess", description = "Размер задачи и её этап процесса")
public class TaskProcessController {

    private final TaskProcessService taskProcessService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}/{taskId}")
    @Operation(summary = "Процесс задачи: размер, текущий этап и обязательные этапы")
    public TaskProcessDto get(
            @Parameter(description = "ИД проекта", required = true) @PathVariable String projectId,
            @Parameter(description = "ИД задачи", required = true) @PathVariable String taskId
    ) throws NotFoundException {
        return taskProcessService.get(projectId, taskId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PutMapping("/project/{projectId}/{taskId}/size")
    @Operation(summary = "Задать размер задачи (понижение фиксируется в истории)")
    public TaskProcessDto setSize(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @RequestBody @Valid TaskSizeRequestDto data
    ) throws NotFoundException {
        return taskProcessService.setSize(projectId, taskId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PutMapping("/project/{projectId}/{taskId}/step")
    @Operation(summary = "Перевести задачу на этап процесса")
    public TaskProcessDto setCurrentStep(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @RequestBody @Valid TaskProcessStepRequestDto data
    ) throws NotFoundException, BadRequestException {
        return taskProcessService.setCurrentStep(projectId, taskId, data);
    }
}
