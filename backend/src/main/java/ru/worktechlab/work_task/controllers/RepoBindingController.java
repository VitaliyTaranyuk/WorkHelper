package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingDto;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.RepoBindingService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

/**
 * T-510: привязка проекта к репозиторию. Проект в пути — как во всех проектных
 * запросах после T-518; «текущего проекта» на сервере больше нет (ADR-026).
 */
@RestController
@RequestMapping("work-task/api/v1/repo-bindings")
@RequiredArgsConstructor
@Tag(name = "RepoBinding", description = "Привязка проекта к репозиторию")
public class RepoBindingController {

    private final RepoBindingService repoBindingService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}")
    @Operation(summary = "Список привязок проекта")
    public List<RepoBindingDto> list(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException {
        return repoBindingService.list(projectId);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PostMapping("/project/{projectId}")
    @Operation(summary = "Привязать репозиторий к проекту")
    public RepoBindingDto create(
            @PathVariable String projectId,
            @RequestBody @Valid RepoBindingRequestDto data
    ) throws NotFoundException, BadRequestException {
        return repoBindingService.create(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/project/{projectId}/{bindingId}")
    @Operation(summary = "Изменить привязку")
    public RepoBindingDto update(
            @PathVariable String projectId,
            @PathVariable String bindingId,
            @RequestBody @Valid RepoBindingRequestDto data
    ) throws NotFoundException, BadRequestException {
        return repoBindingService.update(projectId, bindingId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @DeleteMapping("/project/{projectId}/{bindingId}")
    @Operation(summary = "Убрать привязку")
    public ApiResponse delete(
            @PathVariable String projectId,
            @PathVariable String bindingId
    ) throws NotFoundException, BadRequestException {
        return repoBindingService.delete(projectId, bindingId);
    }
}
