package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.worktechlab.work_task.dto.HealthResponseDto;
import ru.worktechlab.work_task.services.HealthService;

/**
 * Работоспособность приложения для гейта деплоя (TD-029).
 *
 * <p>Прежний healthcheck бил GET-ом в POST-эндпоинт {@code /auth/login} и не
 * проверял код ответа — контейнер объявлялся {@code healthy}, отвечая 405 или
 * 500 на всё подряд, а деплой считал сломанный релиз выложенным (W-06).
 *
 * <p>Путь открыт без авторизации: проверку выполняет docker изнутри контейнера,
 * JWT там взять неоткуда. Тело ответа не раскрывает ничего, кроме состояния
 * компонентов (K-34).
 */
@RestController
@RequestMapping(HealthController.PATH)
@RequiredArgsConstructor
@Tag(name = "Health", description = "Работоспособность приложения")
public class HealthController {

    /**
     * Единственный источник пути: его же используют {@code SecurityConfig} и
     * healthcheck в {@code docker-compose.vds.yml} (сверяется тестом
     * {@code DeployGateContractTest}) — чтобы конфигурация деплоя и код не
     * разошлись молча, как это и произошло в TD-029.
     */
    public static final String PATH = "/work-task/api/v1/health";

    private final HealthService healthService;

    @GetMapping
    @Operation(summary = "Работоспособность: 200 — приложение работает, 503 — нет")
    public ResponseEntity<HealthResponseDto> health() {
        HealthResponseDto health = healthService.check();
        return ResponseEntity
                .status(health.isUp() ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                .body(health);
    }
}
