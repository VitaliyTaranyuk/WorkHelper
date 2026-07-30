package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.HealthResponseDto;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Проверка работоспособности приложения для гейта деплоя (TD-029).
 *
 * <p>Проверять «поднялся ли процесс» бессмысленно: приложение, у которого
 * отвалилась база, отвечает на каждый запрос ошибкой, но порт слушает. Поэтому
 * проверка делает реальный поход в пул соединений — это то же самое, что
 * произойдёт на первом же пользовательском запросе.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class HealthService {

    /**
     * Проверка обязана уложиться в {@code timeout} healthcheck'а
     * (10 с в docker-compose.vds.yml) с запасом на сам HTTP-запрос.
     */
    private static final int DB_CHECK_TIMEOUT_SECONDS = 2;

    private final DataSource dataSource;

    /**
     * T-305: коммит, из которого собран образ. Приезжает build-аргументом в
     * `ENV APP_VERSION` (см. backend/Dockerfile); при локальном запуске и
     * ручной сборке остаётся `unknown` — это честный ответ, а не поломка.
     */
    @Value("${APP_VERSION:unknown}")
    private String appVersion;

    public HealthResponseDto check() {
        return HealthResponseDto.ofDatabase(databaseReachable(), appVersion);
    }

    private boolean databaseReachable() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(DB_CHECK_TIMEOUT_SECONDS);
        } catch (SQLException e) {
            log.warn("Health: база данных недоступна: {}", e.getMessage());
            return false;
        }
    }
}
