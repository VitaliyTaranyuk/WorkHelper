package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.monitoring.MonitoringWebhookDto;
import ru.worktechlab.work_task.services.MonitoringAlertService;

/**
 * Приём алертов прод-мониторинга клиентских ошибок (ТП-175). Вызывается
 * сервером мониторинга (GlitchTip) по вебхуку, а не пользователем, поэтому
 * путь открыт в SecurityConfig и защищён общим секретом в query
 * (?token=…): без валидного токена — 403, при пустом конфиге приём выключен.
 */
@RestController
@RequestMapping("work-task/api/v1/monitoring")
@RequiredArgsConstructor
@Tag(name = "Monitoring", description = "Интеграция с мониторингом клиентских ошибок")
public class MonitoringController {

    private final MonitoringAlertService monitoringAlertService;

    @PostMapping("/alert")
    @Operation(summary = "Вебхук алерта мониторинга (GlitchTip) → уведомления команде")
    public ApiResponse acceptAlert(@RequestParam("token") String token,
                                   @RequestBody MonitoringWebhookDto payload) {
        return monitoringAlertService.acceptAlert(token, payload);
    }
}
