package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.services.LoginRateLimiter;
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
    private final LoginRateLimiter loginRateLimiter;

    /**
     * T-302: проверка лимита стоит ДО обращения к сервису, а учёт неудачи —
     * вокруг него. Причина в том, что ограничение обязано считать именно
     * неудачи: успешный вход бюджет не расходует, иначе офис за одним
     * NAT-адресом блокировал бы сам себя.
     *
     * Пароль здесь не логируется и в сообщение не попадает — наружу идёт только
     * указание, когда повторить (**K-34**).
     */
    @PostMapping("/login")
    @Operation(summary = "Войти в учетную запись")
    public LoginResponseDTO authenticateUser(
            @Parameter(description = "Данные для аутентификации")
            @RequestBody LoginRequestDTO loginRequestDTO,
            HttpServletRequest request) throws NotFoundException {
        loginRateLimiter.checkAllowed(request);
        try {
            return authService.authenticate(loginRequestDTO);
        } catch (RuntimeException | NotFoundException e) {
            loginRateLimiter.recordFailure(request);
            throw e;
        }
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

