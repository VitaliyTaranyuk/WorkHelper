package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.auth.LoginRequestDTO;
import ru.worktechlab.work_task.dto.auth.LoginResponseDTO;
import ru.worktechlab.work_task.dto.auth.TokenRefreshRequestDTO;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.AuthService;
import ru.worktechlab.work_task.services.UserService;

@RestController
@RequestMapping("/work-task/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authenticate", description = "Аутентификация пользователей")
public class UserAuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    @Operation(summary = "Войти в учетную запись")
    public LoginResponseDTO authenticateUser(
            @Parameter(description = "Данные для аутентификации")
            @RequestBody LoginRequestDTO loginRequestDTO) throws NotFoundException {
        return authService.authenticate(loginRequestDTO);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Обновить accessToken клиента")
    public LoginResponseDTO refreshToken(@RequestBody TokenRefreshRequestDTO request) {
        return authService.refreshAccessToken(request);
    }

    @Operation(summary = "Подтверждение почты пользователем")
    @GetMapping(value = "/confirm-email")
    public Boolean confirmEmail(@Parameter(description = "Токен подтверждения", example = "656c989e-ceb1-4a9f-a6a9-9ab40cc11540", required = true)
                                @RequestParam String token) {
        return userService.emailConfirmation(token);
    }

    @Operation(summary = "Выход из системы")
    @PostMapping("/logout")
    public void logout() throws NotFoundException {
        authService.logout();
    }
}

