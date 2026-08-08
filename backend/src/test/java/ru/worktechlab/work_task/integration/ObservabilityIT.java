package ru.worktechlab.work_task.integration;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import ru.worktechlab.work_task.controllers.HealthController;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-301: метрики проверяются на поднятом приложении, а не по конфигурации.
 * Утверждение «actuator подключён» ничего не стоит, пока не показано, что
 * эндпоинт отвечает, отдаёт нужные счётчики и <b>не виден на публичном порту</b>.
 *
 * <p>Порт метрик здесь случайный ({@code management.server.port: 0} в профиле
 * {@code test}) — прогон не должен падать из-за занятого порта. Проверяется не
 * номер, а <b>разделение</b> портов; сам номер и его публикацию только на
 * loopback закрепляет {@code ObservabilityContractTest}.
 *
 * <p>Тег {@code integration}: нужен живой PostgreSQL, запуск —
 * {@code ./gradlew integrationTest}.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ObservabilityIT {

    private final TestRestTemplate rest = new TestRestTemplate();

    @LocalServerPort
    private int appPort;

    @LocalManagementPort
    private int managementPort;

    @Test
    void metricsAnswerOnManagementPort() {
        ResponseEntity<String> response = get(managementPort, "/actuator/metrics");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody())
                .as("без jvm-метрик разбор «почему на VDS кончилась память» опирался бы на догадки")
                .contains("jvm.memory.used");
    }

    /**
     * Главная метрика для разбора инцидентов: количество, время и <b>исход</b>
     * запросов по каждому маршруту. Появляется только после реального обращения
     * — поэтому запрос сначала делается, а потом проверяется счётчик.
     */
    @Test
    void requestsAreCountedByRouteAndOutcome() {
        get(appPort, HealthController.PATH);

        ResponseEntity<String> metric = get(managementPort, "/actuator/metrics/http.server.requests");

        assertThat(metric.getStatusCode().value()).isEqualTo(200);
        assertThat(metric.getBody()).contains("http.server.requests", "COUNT");
    }

    /**
     * Обратная сторона решения: публичный порт — единственный, который
     * проксирует nginx. Метрики на нём означали бы, что счётчики приложения
     * доступны из интернета.
     */
    @Test
    void metricsAreNotServedOnThePublicPort() {
        ResponseEntity<String> response = get(appPort, "/actuator/metrics");

        assertThat(response.getBody() == null || !response.getBody().contains("jvm.memory.used"))
                .as("метрики отвечают на публичном порту — их проксирует nginx вместе с /work-task/")
                .isTrue();
    }

    /**
     * Список экспонированных эндпоинтов — не декларация, а граница: {@code env}
     * раскрыл бы конфигурацию вместе с именами секретов и их источниками.
     *
     * <p>Проверяется <b>свойство</b>, а не код ответа. Первая версия теста
     * ждала 404 и упала на 401: неэкспонированный эндпоинт не отображён вовсе,
     * поэтому запрос не совпадает ни с одним правилом Actuator и упирается в
     * общее {@code anyRequest().authenticated()}. Код здесь — следствие
     * устройства цепочки, а не то, что задача обязана гарантировать; требовать
     * его значило бы закрепить тестом деталь реализации Spring.
     */
    @Test
    void configurationEndpointsAreNotExposedAtAll() {
        ResponseEntity<String> response = get(managementPort, "/actuator/env");

        assertThat(response.getStatusCode().value()).isNotEqualTo(200);
        assertThat(response.getBody() == null || !response.getBody().contains("propertySources"))
                .as("actuator отдаёт конфигурацию приложения — список include шире, чем задумано")
                .isTrue();
    }

    private ResponseEntity<String> get(int port, String path) {
        return rest.getForEntity("http://localhost:" + port + path, String.class);
    }
}
