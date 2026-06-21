package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.StringIdsDto;
import ru.worktechlab.work_task.dto.users.UserDataDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.ProjectsService;
import ru.worktechlab.work_task.services.UserService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.ADMIN;
import static ru.worktechlab.work_task.models.enums.Roles.Fields.PROJECT_OWNER;

@RestController
@RequestMapping("/work-task/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Администрирование")
public class AdminController {

    private final UserService userService;
    private final ProjectsService projectsService;

    @RolesAllowed({ADMIN})
    @Operation(summary = "Активировать пользователей по существующим ИД")
    @PutMapping("/activate")
    public void activateUsers(
            @Parameter(description = "Идентификаторы пользователей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
            @RequestBody StringIdsDto data) throws NotFoundException {
        userService.activateUsers(data, true);
    }

    @RolesAllowed({ADMIN})
    @Operation(summary = "Заблокировать пользователей по существующим ИД")
    @PutMapping("/block")
    public void blockUsers(
            @Parameter(description = "Идентификаторы пользователей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
            @RequestBody StringIdsDto data) throws NotFoundException {
        userService.activateUsers(data, false);
    }

    @RolesAllowed({ADMIN})
    @Operation(summary = "Полные данные пользователя")
    @GetMapping("/{userId}/profile")
    public UserDataDto getUser(
            @Parameter(description = "ИД пользователя", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String userId) throws NotFoundException {
        return userService.getUser(userId);
    }

    @RolesAllowed({ADMIN})
    @PutMapping("/{projectId}/{userId}/update-owner")
    @Operation(summary = "Добавление руководителя проекта")
    public void updateProjectOwner(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "ИД пользователя", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String userId
    ) throws NotFoundException {
        projectsService.addProjectOwner(projectId, userId);
    }

    @RolesAllowed({ADMIN})
    @Operation(summary = "Обновление ролей пользователя")
    @PutMapping("/{userId}/update-roles")
    public UserDataDto updateUserRoles(
            @Parameter(description = "ИД пользователя", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String userId,
            @Parameter(description = "Идентификаторы ролей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
            @RequestBody StringIdsDto data) throws NotFoundException {
        return userService.updateUserRoles(userId, data);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/{userId}/add-extended-permission")
    @Operation(summary = "Добавление расширенных прав")
    public void addExtendedPermissionsForUserProject(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "ИД пользователя", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String userId
    ) throws NotFoundException, BadRequestException {
        projectsService.addExtendedPermissionsForUserProject(projectId, userId);
    }

    @RolesAllowed({PROJECT_OWNER})
    @PutMapping("/{projectId}/{userId}/delete-extended-permission")
    @Operation(summary = "Удаление расширенных прав")
    public void deleteExtendedPermissionsForUserProject(
            @Parameter(description = "ИД проекта", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String projectId,
            @Parameter(description = "ИД пользователя", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
            @PathVariable String userId
    ) throws NotFoundException, BadRequestException {
        projectsService.deleteExtendedPermissionsForUserProject(projectId, userId);
    }
}
