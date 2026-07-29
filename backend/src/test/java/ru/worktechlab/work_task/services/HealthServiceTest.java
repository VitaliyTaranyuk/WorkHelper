package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.dto.HealthResponseDto;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * TD-029: проверка обязана отличать «процесс поднялся» от «приложение
 * работает». Без похода в базу healthcheck подтверждал бы работоспособность
 * приложения, которое на каждый запрос отвечает 500.
 */
@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @InjectMocks
    private HealthService healthService;

    @Test
    void upWhenDatabaseAnswers() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        HealthResponseDto health = healthService.check();

        assertThat(health.isUp()).isTrue();
        assertThat(health.getStatus()).isEqualTo(HealthResponseDto.UP);
        assertThat(health.getDatabase()).isEqualTo(HealthResponseDto.UP);
    }

    @Test
    void downWhenConnectionIsBroken() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);

        HealthResponseDto health = healthService.check();

        assertThat(health.isUp()).isFalse();
        assertThat(health.getStatus()).isEqualTo(HealthResponseDto.DOWN);
        assertThat(health.getDatabase()).isEqualTo(HealthResponseDto.DOWN);
    }

    @Test
    void downWhenPoolCannotGiveConnection() throws SQLException {
        when(dataSource.getConnection()).thenThrow(new SQLException("connection refused"));

        HealthResponseDto health = healthService.check();

        assertThat(health.isUp()).isFalse();
        assertThat(health.getDatabase()).isEqualTo(HealthResponseDto.DOWN);
    }

    /**
     * Проверка выполняется каждые 30 секунд весь срок жизни контейнера:
     * невозвращённое в пул соединение исчерпало бы пул за сутки.
     */
    @Test
    void connectionIsReturnedToPool() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        healthService.check();

        verify(connection).close();
    }
}
