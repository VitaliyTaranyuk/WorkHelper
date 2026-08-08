package ru.worktechlab.work_task.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-301: наблюдаемость держится на конфигурации, а конфигурацию не проверяет
 * ничто — ровно так уже отказывал этот узел. Профиль {@code vds} однажды
 * остался в {@code logback-spring.xml} без единого appender'а, и логи прода не
 * попадали никуда: приложение работало, диагностика была слепой, сообщения об
 * ошибке не было (W-06, найдено при разборе ТП-212).
 *
 * <p>Тест закрепляет три утверждения, каждое из которых живёт в отдельном файле
 * и потому способно разойтись с остальными молча — тот же класс, что TD-029:
 * <ol>
 *   <li>наружу экспонированы только метрики (ни конфигурация, ни дамп памяти);</li>
 *   <li>служебный порт публикуется лишь на loopback и совпадает с тем, который
 *       проверяет шаг деплоя;</li>
 *   <li>боевой профиль пишет структурированный лог, а лог контейнера ограничен
 *       по размеру.</li>
 * </ol>
 *
 * <p>Читает файлы из корня репозитория, как {@code DeployGateContractTest},
 * поэтому работает на полном чекауте — именно так их запускают CI и локальный
 * прогон.
 */
class ObservabilityContractTest {

    private static final Path REPO_ROOT = Path.of("..");
    private static final Path APPLICATION_YML = Path.of("src/main/resources/application.yml");
    private static final Path LOGBACK = Path.of("src/main/resources/logback-spring.xml");
    private static final Path COMPOSE = REPO_ROOT.resolve("docker-compose.vds.yml");
    private static final Path DEPLOY_WORKFLOW = REPO_ROOT.resolve(".github/workflows/deploy.yml");

    /**
     * Эндпоинты, публикация которых означала бы утечку: первые три отдают
     * конфигурацию вместе с именами секретов и подставленными значениями,
     * heapdump — содержимое памяти процесса, threaddump — стеки всех потоков.
     */
    private static final List<String> FORBIDDEN_ENDPOINTS =
            List.of("env", "configprops", "beans", "heapdump", "threaddump", "*");

    @Test
    void onlyMetricsAreExposed() throws IOException {
        String exposure = valueOf(read(APPLICATION_YML), "\\n\\s*include:\\s*(\\S+)");

        assertThat(exposure)
                .as("actuator экспонирует не только метрики — проверьте список include")
                .isEqualTo("metrics");
        assertThat(FORBIDDEN_ENDPOINTS)
                .allSatisfy(forbidden -> assertThat(exposure).doesNotContain(forbidden));
    }

    /**
     * Здоровье в проекте отдаёт {@link ru.worktechlab.work_task.controllers.HealthController}
     * — его же зовут healthcheck контейнера и гейт деплоя. Второй ответ на тот
     * же вопрос неизбежно разошёлся бы с первым (K-40), поэтому actuator-эндпоинт
     * health не экспонируется намеренно, а не по забывчивости.
     */
    @Test
    void healthStaysWithTheSingleExistingEndpoint() throws IOException {
        assertThat(valueOf(read(APPLICATION_YML), "\\n\\s*include:\\s*(\\S+)"))
                .doesNotContain("health");
    }

    @Test
    void metricsListenOnSeparatePortPublishedOnlyOnLoopback() throws IOException {
        String managementPort = managementPort();
        String backendService = composeBackendService();

        assertThat(managementPort)
                .as("метрики на общем порту попали бы под публичный маршрут nginx /work-task/")
                .isNotEqualTo(valueOf(read(APPLICATION_YML), "\\n\\s*port:\\s*\\$\\{PORT:(\\d+)}"));
        assertThat(backendService)
                .as("служебный порт обязан публиковаться только на 127.0.0.1 — иначе метрики видны из интернета")
                .contains("\"127.0.0.1:" + managementPort + ":" + managementPort + "\"");
    }

    @Test
    void deployChecksTheSamePortApplicationListensOn() throws IOException {
        assertThat(read(DEPLOY_WORKFLOW))
                .as("шаг деплоя проверяет не тот порт, на котором приложение отдаёт метрики — гейт бесполезен")
                .contains("http://127.0.0.1:" + managementPort() + "/actuator/metrics");
    }

    /**
     * Гейт деплоя отличает структурированный лог от текстового грепом по полю
     * {@code @timestamp}. Признак и формат живут в разных файлах, поэтому
     * проверяются парой: здесь — что гейт ищет именно его, в
     * {@code StructuredLogFormatTest} — что encoder именно его и печатает.
     * Первый прогон показал, зачем это нужно: шаблон был написан по памяти
     * ({@code ecs.version}), а ECS пишет вложенное {@code "ecs":{"version"}}.
     */
    @Test
    void deployLooksForTheMarkerStructuredLogActuallyPrints() throws IOException {
        assertThat(read(DEPLOY_WORKFLOW))
                .as("шаг деплоя ищет в логе прода признак, которого там нет — гейт красит деплой без причины")
                .contains("grep -q \"@timestamp\"");
    }

    @Test
    void containerLogIsSizeLimited() throws IOException {
        assertThat(composeBackendService())
                .as("json-file без max-size растёт до заполнения диска VDS, и первой это заметит база")
                .contains("max-size");
    }

    @Test
    void productionProfileWritesStructuredLog() throws IOException {
        String logback = read(LOGBACK);
        String vdsProfile = between(logback, "<springProfile name=\"vds\">", "</springProfile>");
        String appenderName = valueOf(vdsProfile, "<appender-ref ref=\"([A-Z]+)\"/>");
        String appender = between(logback, "<appender name=\"" + appenderName + "\"", "</appender>");

        assertThat(appender)
                .as("боевой лог обязан быть машинно разбираемым: единственный канал на VDS — docker logs")
                .contains("org.springframework.boot.logging.logback.StructuredLogEncoder");
    }

    private String managementPort() throws IOException {
        return valueOf(read(APPLICATION_YML), "\\n\\s*port:\\s*\\$\\{MANAGEMENT_PORT:(\\d+)}");
    }

    /**
     * Блок сервиса backend в compose: от его заголовка до следующего сервиса.
     * Ограничение по блоку намеренное — {@code max-size} есть смысл искать
     * именно у backend, а не где угодно в файле.
     */
    private String composeBackendService() throws IOException {
        String compose = read(COMPOSE);
        int start = compose.indexOf("\n  backend:");
        assertThat(start).as("в docker-compose.vds.yml не найден сервис backend").isNotNegative();
        Matcher next = Pattern.compile("\\n {2}[a-z][\\w-]*:").matcher(compose);
        int end = next.find(start + 1) ? next.start() : compose.length();
        return compose.substring(start, end);
    }

    private String between(String text, String from, String to) {
        int start = text.indexOf(from);
        assertThat(start).as("не найден фрагмент: " + from).isNotNegative();
        int end = text.indexOf(to, start);
        assertThat(end).as("не найден конец фрагмента: " + to).isNotNegative();
        return text.substring(start, end);
    }

    private String valueOf(String text, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(text);
        assertThat(matcher.find()).as("не найдено по шаблону: " + regex).isTrue();
        return matcher.group(1);
    }

    private String read(Path path) throws IOException {
        assertThat(path).as("тест запускается из каталога backend полного чекаута репозитория").exists();
        return Files.readString(path, StandardCharsets.UTF_8);
    }
}
