package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.rules.ProcessStepDto;
import ru.worktechlab.work_task.dto.rules.ProcessStepRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.ProcessStepService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

/**
 * T-515: процесс задачи проекта. Проект в пути — как во всех проектных запросах после
 * T-518 (ADR-026). Роли отсекают неаутентифицированных, а «читает участник, меняет
 * владелец» решает сервис (**W-04**).
 */
@RestController
@RequestMapping("work-task/api/v1/process-steps")
@RequiredArgsConstructor
@Tag(name = "ProcessStep", description = "Этапы процесса задачи проекта")
public class ProcessStepController {

    private final ProcessStepService processStepService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}")
    @Operation(summary = "Этапы процесса проекта")
    public List<ProcessStepDto> list(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException {
        return processStepService.list(projectId);
    }

    @RolesAllowed({PROJECT_OWNER, ADMIN})
    @PostMapping("/project/{projectId}")
    @Operation(summary = "Добавить этап процесса")
    public ProcessStepDto create(
            @PathVariable String projectId,
            @RequestBody @Valid ProcessStepRequestDto data
    ) throws NotFoundException, BadRequestException {
        return processStepService.create(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER, ADMIN})
    @PostMapping("/project/{projectId}/defaults")
    @Operation(summary = "Завести процесс по умолчанию (A0…V) в существующем проекте")
    public List<ProcessStepDto> createDefaults(@PathVariable String projectId)
            throws NotFoundException, BadRequestException {
        return processStepService.createDefaults(projectId);
    }

    @RolesAllowed({PROJECT_OWNER, ADMIN})
    @PutMapping("/project/{projectId}/{stepId}")
    @Operation(summary = "Изменить этап процесса")
    public ProcessStepDto update(
            @PathVariable String projectId,
            @PathVariable String stepId,
            @RequestBody @Valid ProcessStepRequestDto data
    ) throws NotFoundException, BadRequestException {
        return processStepService.update(projectId, stepId, data);
    }

    @RolesAllowed({PROJECT_OWNER, ADMIN})
    @PostMapping("/project/{projectId}/{stepId}/move")
    @Operation(summary = "Сдвинуть этап на одну позицию")
    public List<ProcessStepDto> move(
            @PathVariable String projectId,
            @PathVariable String stepId,
            @Parameter(description = "true — выше по процессу, false — ниже")
            @RequestParam boolean up
    ) throws NotFoundException, BadRequestException {
        return processStepService.move(projectId, stepId, up);
    }

    @RolesAllowed({PROJECT_OWNER, ADMIN})
    @DeleteMapping("/project/{projectId}/{stepId}")
    @Operation(summary = "Удалить этап процесса")
    public ApiResponse delete(
            @PathVariable String projectId,
            @PathVariable String stepId
    ) throws NotFoundException, BadRequestException {
        return processStepService.delete(projectId, stepId);
    }
}
