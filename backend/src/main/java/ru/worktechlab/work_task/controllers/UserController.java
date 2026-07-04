package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.EnumValuesResponse;
import ru.worktechlab.work_task.dto.StringIdsDto;
import ru.worktechlab.work_task.dto.users.UpdateProfileRequest;
import ru.worktechlab.work_task.dto.users.UpdateUserRequest;
import ru.worktechlab.work_task.dto.users.UserDataDto;
import ru.worktechlab.work_task.dto.users.UserPickerDto;
import ru.worktechlab.work_task.dto.users.UserSettingsDto;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.UserService;
import ru.worktechlab.work_task.services.UserSettingsService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("/work-task/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "Управление пользователями")
public class UserController {

    private final UserService userService;
    private final UserSettingsService userSettingsService;

    @RolesAllowed({ADMIN, PROJECT_OWNER})
    @Operation(summary = "Список всех пользователей")
    @GetMapping
    public List<UserShortDataDto> getAllUsers() {
        return userService.getAllUsers();
    }

    /**
     * Единый источник для assignee picker / @mention autocomplete / комментариев.
     * Доступен всем участникам проекта. Только активные подтверждённые
     * пользователи; поиск по firstName/lastName/displayName/username/email.
     */
    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Picker: активные пользователи для assignee / @mention")
    @GetMapping("/picker")
    public List<UserPickerDto> picker(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false, defaultValue = "20") int limit
    ) {
        return userService.pickerSearch(q, limit);
    }

//    @RolesAllowed({PROJECT_MEMBER, PROJECT_OWNER})
//    @Operation(summary = "Список всех пользователей по существующим ИД")
//    @PostMapping()
//    public List<UserShortDataDto> findUsersByIdsIn(
//            @Parameter(description = "Идентификаторы пользователей", example = "[\"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", \"656c989e-ceb1-4a9f-a6a9-9ab40cc11540\", ...]")
//            @RequestBody StringIdsDto data) throws NotFoundException {
//        return userService.findUsersByIdsIn(data);
//    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Редактирование пользователя")
    @PutMapping("/update")
    public UserDataDto updateUser(
            @Parameter(description = "Данные пользователя")
            @RequestBody UpdateUserRequest data) throws NotFoundException {
        return userService.updateUser(data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Полные данные пользователя(текущего)")
    @GetMapping("/profile")
    public UserDataDto getUser() {
        return userService.getUser();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Минимальное редактирование профиля (имя, displayName, username)")
    @PutMapping("/profile")
    public UserDataDto updateProfile(
            @jakarta.validation.Valid @RequestBody UpdateProfileRequest data)
            throws NotFoundException, ru.worktechlab.work_task.exceptions.BadRequestException {
        return userService.updateProfile(data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Список возможных значений при выборе пола")
    @GetMapping("/gender-values")
    public EnumValuesResponse getGenderValues() {
        return userService.getGenderValues();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Настройки уведомлений текущего пользователя (ТП-65)")
    @GetMapping("/settings")
    public UserSettingsDto getSettings() {
        return userSettingsService.getForCurrentUser();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @Operation(summary = "Обновить настройки уведомлений текущего пользователя (ТП-65)")
    @PutMapping("/settings")
    public UserSettingsDto updateSettings(
            @jakarta.validation.Valid @RequestBody UserSettingsDto data) {
        return userSettingsService.updateForCurrentUser(data);
    }
}
