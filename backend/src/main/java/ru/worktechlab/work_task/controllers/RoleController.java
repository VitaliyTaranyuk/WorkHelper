package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.worktechlab.work_task.dto.roles.RoleDataResponse;
import ru.worktechlab.work_task.services.RoleService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.ADMIN;

@RestController
@RequestMapping("work-task/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Role", description = "Управление по ролями системы")
public class RoleController {

    private final RoleService roleService;

    @RolesAllowed({ADMIN})
    @Operation(summary = "Список ролей системы")
    @GetMapping
    public RoleDataResponse getRoles() {
        return roleService.getAllRoles();
    }
}
