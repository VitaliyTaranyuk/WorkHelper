package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.statuses.CreateTaskStatusDto;
import ru.worktechlab.work_task.dto.statuses.StatusListResponseDto;
import ru.worktechlab.work_task.dto.statuses.TaskStatusDto;
import ru.worktechlab.work_task.dto.statuses.UpdateRequestStatusesDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.TaskStatusService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("work-task/api/v1/statuses")
@RequiredArgsConstructor
@Tag(name = "Status", description = "Управление статусами")
public class TaskStatusController {

    private final TaskStatusService taskStatusService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}")
    @Operation(summary = "Список статусов проекта")
    public StatusListResponseDto getStatuses(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId
    ) throws NotFoundException {
        return taskStatusService.getStatuses(projectId);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PostMapping("/project/{projectId}/create")
    @Operation(summary = "Создание статуса")
    public TaskStatusDto createStatus(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @RequestBody @Valid CreateTaskStatusDto data
    ) throws NotFoundException, BadRequestException {
        return taskStatusService.createStatus(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/project/{projectId}/update")
    @Operation(summary = "Обновление данных статусов")
    public StatusListResponseDto updateStatuses(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "Информация по статусам", required = true)
            @RequestBody @Valid UpdateRequestStatusesDto data
    ) throws NotFoundException, BadRequestException {
        return taskStatusService.updateStatuses(projectId, data);
    }
}
