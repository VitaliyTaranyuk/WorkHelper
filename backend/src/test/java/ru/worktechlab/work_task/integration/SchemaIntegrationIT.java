package ru.worktechlab.work_task.integration;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-101: первый интеграционный тест проекта. Поднимает полный контекст Spring
 * против ЖИВОГО PostgreSQL и проверяет то, чего не может проверить ни один
 * модульный тест.
 *
 * <p><b>Главная проверка здесь — не утверждения ниже, а сам факт старта.</b>
 * Профиль {@code test} задаёт {@code ddl-auto: validate}: схему создаёт
 * Liquibase, а Hibernate сверяет с ней маппинги всех сущностей. Расхождение
 * «сущность ↔ таблица» роняет контекст до первого {@code @Test}. Ровно этот
 * риск TD-004 называл словами «тесты могут расходиться с реальной схемой», и
 * до T-101 его не проверяло ничто: классов с {@code @SpringBootTest} в проекте
 * было ноль, а поднимаемый в CI {@code postgres:16} не использовался.
 *
 * <p>Тест помечен тегом {@code integration} и в {@code ./gradlew test} НЕ
 * входит — он требует БД. Запуск: {@code ./gradlew integrationTest}.
 */
/*
 * RANDOM_PORT, а не MOCK: приложение экспортирует WebSocket-эндпоинт (звонки),
 * и мок-контекст падает с «Attribute 'jakarta.websocket.server.ServerContainer'
 * not found in ServletContext» — найдено прогоном в CI. Встроенный контейнер
 * дороже на несколько секунд, но проверяет тот же путь старта, что и прод,
 * а не его усечённую версию. Порт случайный: занятый 8080 не должен ронять
 * прогон.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SchemaIntegrationIT {

    /**
     * Таблицы, отсутствие которых означает, что миграции не доехали. Список
     * намеренно короткий и разнородный: по одной из ранних миграций, из
     * середины истории и из фазы 5.2 — так проверяется вся цепочка, а не
     * только последний changeSet.
     */
    private static final List<String> EXPECTED_TABLES = List.of(
            "users",
            "project",
            "task_model",
            "task_status",
            "sprint",
            "repo_binding",
            "rule_set",
            "rule",
            "process_step");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void liquibaseAppliedMigrationsToEmptyDatabase() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM databasechangelog", Integer.class);

        assertThat(applied)
                .as("Liquibase не применил ни одного changeSet — схема пустая")
                .isNotNull()
                .isPositive();
    }

    @Test
    void schemaContainsTablesFromEveryStageOfHistory() {
        List<String> present = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
                String.class);

        assertThat(present)
                .as("в схеме нет таблиц, которые обязаны быть после всех миграций")
                .containsAll(EXPECTED_TABLES);
    }

    @Test
    void liquibaseLeftNoChangeSetInProgress() {
        Integer locked = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM databasechangeloglock WHERE locked = true", Integer.class);

        assertThat(locked)
                .as("остался незанятый замок Liquibase — миграция оборвалась на середине")
                .isNotNull()
                .isZero();
    }
}
