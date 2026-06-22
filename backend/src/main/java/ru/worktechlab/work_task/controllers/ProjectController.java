package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.StringIdsDto;
import ru.worktechlab.work_task.dto.projects.*;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.dto.history.ProjectHistoryDto;
import ru.worktechlab.work_task.services.ProjectHistoryService;
import ru.worktechlab.work_task.services.ProjectsService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("work-task/api/v1/projects")
@RequiredArgsConstructor
@Tag(name = "Project", description = "Управление проектами")
public class ProjectController {

    private final ProjectsService projectsService;
    private final ProjectHistoryService projectHistoryService;

    @RolesAllowed({ADMIN, PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/for-user")
    @Operation(summary = "Вывести список проектов пользователя")
    public List<ShortProjectDataDto> getAllUserProjects() {
        return projectsService.getAllUserProjects();
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @GetMapping("/last")
    @Operation(summary = "Получить ID основного проекта пользователя")
    public String getActiveProject() {
        return projectsService.getLastProjectId();
    }

    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER, POWER_USER, ADMIN})
    @PostMapping("/create")
    @Operation(summary = "Создание проекта")
    public ProjectDto createProject(
            @RequestBody @Valid ProjectRequestDto data
    ) {
        return projectsService.createProject(data);
    }

    @RolesAllowed({ADMIN, PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}")
    @Operation(summary = "Получение данных проекта по ИД")
    public ProjectDto getProjectData(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId
    ) throws NotFoundException {
        return projectsService.getProjectData(projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @PostMapping("/{projectId}/filtered")
    @Operation(summary = "Получение данных проекта по ИД и фильтру")
    public ProjectDataDto getProjectDataByFilter(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "Данные фильтра")
            @RequestBody @Valid ProjectDataFilterDto filter
    ) throws NotFoundException {
        return projectsService.getProjectDataByFilter(projectId, filter);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/finish")
    @Operation(summary = "Завершение проекта по ИД")
    public ProjectDto finishProject(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return projectsService.finishProject(projectId);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/start")
    @Operation(summary = "Запуск проекта по ИД")
    public ProjectDto startProject(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return projectsService.startProject(projectId);
    }

    @PutMapping("/{projectId}/add-users")
    @RolesAllowed({PROJECT_OWNER})
    @Operation(summary = "Добавление проекта пользователям")
    public void addProjectForUsers(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "Идентификаторы пользователей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
            @RequestBody StringIdsDto data
    ) throws NotFoundException, BadRequestException {
        projectsService.addProjectForUsers(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @DeleteMapping("/{projectId}/delete-users")
    @Operation(summary = "Удаление пользователей из проекта")
    public void deleteProjectForUsers(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "Идентификаторы пользователей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
            @RequestBody StringIdsDto data
    ) throws NotFoundException, BadRequestException {
        projectsService.deleteProjectForUsers(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/edit")
    @Operation(summary = "Редактирование проекта")
    public ProjectDto updateProject(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "Данные проекта")
            @RequestBody EditProjectRequestDto data
    ) throws NotFoundException, BadRequestException {
        return projectsService.editProject(projectId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/archive")
    @Operation(summary = "Архивирование проекта")
    public ProjectDto archiveProject(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return projectsService.archiveProject(projectId);
    }

    @RolesAllowed({PROJECT_OWNER})
    @DeleteMapping("/{projectId}")
    @Operation(summary = "Удаление проекта")
    public ApiResponse deleteProject(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return projectsService.deleteProject(projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_MEMBER, PROJECT_OWNER, POWER_USER})
    @GetMapping("/{projectId}/history")
    @Operation(summary = "История изменений проекта (дифф)")
    public List<ProjectHistoryDto> getProjectHistory(
            @PathVariable String projectId
    ) throws NotFoundException {
        return projectHistoryService.getHistory(projectId);
    }
}
