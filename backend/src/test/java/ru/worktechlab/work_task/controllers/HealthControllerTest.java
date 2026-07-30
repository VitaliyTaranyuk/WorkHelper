package ru.worktechlab.work_task.controllers;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import ru.worktechlab.work_task.dto.HealthResponseDto;
import ru.worktechlab.work_task.services.HealthService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * TD-029: гейт деплоя видит не тело ответа, а КОД. `curl -f` считает проверку
 * пройденной на любом 2xx, поэтому неработающее приложение обязано отвечать
 * 503, а не 200 с телом {"status":"DOWN"} — иначе фикс healthcheck'а
 * бесполезен.
 */
@ExtendWith(MockitoExtension.class)
class HealthControllerTest {

    @Mock
    private HealthService healthService;

    @InjectMocks
    private HealthController healthController;

    @Test
    void answers200WhenApplicationWorks() {
        when(healthService.check()).thenReturn(HealthResponseDto.ofDatabase(true, "abc1234"));

        ResponseEntity<HealthResponseDto> response = healthController.health();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(HealthResponseDto.UP);
    }

    @Test
    void answers503WhenDatabaseIsUnreachable() {
        when(healthService.check()).thenReturn(HealthResponseDto.ofDatabase(false, "abc1234"));

        ResponseEntity<HealthResponseDto> response = healthController.health();

        assertThat(response.getStatusCode())
                .as("2xx на сломанном приложении прошёл бы гейт деплоя (TD-029)")
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(HealthResponseDto.DOWN);
    }
}
