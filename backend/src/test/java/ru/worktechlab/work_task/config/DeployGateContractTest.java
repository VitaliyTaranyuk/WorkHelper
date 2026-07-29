package ru.worktechlab.work_task.config;

import org.junit.jupiter.api.Test;
import ru.worktechlab.work_task.controllers.HealthController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TD-029: гейт деплоя жил в конфигурации, а проверял код — и они молча
 * разошлись. Healthcheck бил в POST-эндпоинт без {@code -f}, а шаг ожидания
 * сравнивал статус контейнера по подстроке, из-за чего «unhealthy» проходил
 * как «healthy». Ни то, ни другое не ловилось ничем: тестов у файлов деплоя
 * нет по определению, а сломанный релиз объявлялся выложенным (W-06).
 *
 * <p>Тест держит связь «конфигурация деплоя ↔ код» в одном месте. Он читает
 * файлы из корня репозитория, поэтому работает только на полном чекауте —
 * именно так их и запускают CI и локальный прогон.
 */
class DeployGateContractTest {

    private static final Path REPO_ROOT = Path.of("..");
    private static final Path COMPOSE = REPO_ROOT.resolve("docker-compose.vds.yml");
    private static final Path DEPLOY_WORKFLOW = REPO_ROOT.resolve(".github/workflows/deploy.yml");

    @Test
    void healthcheckAsksTheEndpointThatExists() throws IOException {
        assertThat(backendHealthcheckLine())
                .as("healthcheck обязан звать существующий GET-эндпоинт, а не любой отвечающий путь")
                .contains(HealthController.PATH);
    }

    @Test
    void healthcheckFailsOnHttpError() throws IOException {
        assertThat(backendHealthcheckLine())
                .as("без -f curl успешен на 405 и 500: контейнер станет healthy, отвечая ошибкой на всё")
                .matches(".*curl\\s+-[a-zA-Z]*f.*");
    }

    @Test
    void deployGateDoesNotMatchHealthStatusBySubstring() throws IOException {
        // Комментарии выброшены намеренно: сам разбор дефекта в deploy.yml
        // цитирует прежний шаблон, и без этого тест ловил бы объяснение
        // вместо кода.
        String executableLines = Files.readAllLines(DEPLOY_WORKFLOW).stream()
                .filter(line -> !line.strip().startsWith("#"))
                .reduce("", (all, line) -> all + line + "\n");

        assertThat(executableLines)
                .as("«Up 2 minutes (unhealthy)» содержит подстроку healthy — такой гейт принимает сломанный релиз")
                .doesNotContain("*healthy*");
    }

    private String backendHealthcheckLine() throws IOException {
        assertThat(COMPOSE)
                .as("тест запускается из каталога backend полного чекаута репозитория")
                .exists();
        // Порт 8080 в этом файле принадлежит только backend — по нему и находим
        // его проверку, не разбирая YAML ради одной строки.
        return Files.readAllLines(COMPOSE).stream()
                .filter(line -> line.contains("test:") && line.contains("localhost:8080"))
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "В docker-compose.vds.yml не найден healthcheck backend'а"));
    }
}
