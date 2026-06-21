package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.sprints.SprintDtoRequest;
import ru.worktechlab.work_task.dto.sprints.SprintInfoDTO;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.SprintsService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("work-task/api/v1/sprints")
@RequiredArgsConstructor
@Tag(name = "Sprint", description = "Управление спринтами")
public class SprintController {
    private final SprintsService sprintsService;

    @RolesAllowed({ADMIN, PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/project/{projectId}/sprint-info")
    @Operation(summary = "Вывести информацию об активном спринте")
    public SprintInfoDTO getSprintInfo(@Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                       @PathVariable String projectId) throws NotFoundException {
        return sprintsService.getActiveSprint(projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER})
    @PostMapping("/project/{projectId}/create")
    @Operation(summary = "Создание спринта")
    public SprintInfoDTO createSprint(@Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                      @PathVariable String projectId,
                                      @Parameter(description = "Данные спринта", required = true)
                                      @RequestBody SprintDtoRequest data) throws NotFoundException {
        return sprintsService.createSprint(projectId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER})
    @PutMapping("/project/{projectId}/{sprintId}/activate")
    @Operation(summary = "Запуск спринта спринта")
    public SprintInfoDTO activateSprint(@Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                        @PathVariable String projectId,
                                        @Parameter(description = "ИД спринта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                        @PathVariable String sprintId) throws NotFoundException, BadRequestException {
        return sprintsService.activateSprint(sprintId, projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER})
    @PutMapping("/project/{projectId}/{sprintId}/finish")
    @Operation(summary = "Завершение спринта")
    public SprintInfoDTO finishSprint(@Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                      @PathVariable String projectId,
                                      @Parameter(description = "ИД спринта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                      @PathVariable String sprintId) throws NotFoundException, BadRequestException {
        return sprintsService.finishSprint(sprintId, projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER})
    @PutMapping("/project/{projectId}/{sprintId}/update")
    @Operation(summary = "Изменение спринта")
    public SprintInfoDTO updateSprint(@Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                      @PathVariable String projectId,
                                      @Parameter(description = "ИД спринта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                      @PathVariable String sprintId,
                                      @Parameter(description = "Данные спринта", required = true)
                                      @RequestBody SprintDtoRequest data) throws NotFoundException, BadRequestException {
        return sprintsService.updateSprint(sprintId, projectId, data);
    }
}