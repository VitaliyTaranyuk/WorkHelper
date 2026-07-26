package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ТП-212: предохранитель расхода платного провайдера. Превышение не ошибка —
 * вызывающий уходит в тот же честный фолбэк, что и при недоступности DeepSeek.
 */
class VoiceEnhancementRateLimiterTest {

    private VoiceEnhancementRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new VoiceEnhancementRateLimiter();
        limiter.setLimitPerHour(3);
    }

    @Test
    void allowsCallsUpToLimitThenBlocks() {
        long now = 1_000_000L;

        assertThat(limiter.tryAcquire("user-1", now)).isTrue();
        assertThat(limiter.tryAcquire("user-1", now)).isTrue();
        assertThat(limiter.tryAcquire("user-1", now)).isTrue();
        assertThat(limiter.tryAcquire("user-1", now)).isFalse();
    }

    @Test
    void limitIsPerUser() {
        long now = 1_000_000L;
        for (int i = 0; i < 3; i++) limiter.tryAcquire("user-1", now);

        assertThat(limiter.tryAcquire("user-1", now)).isFalse();
        assertThat(limiter.tryAcquire("user-2", now)).isTrue();
    }

    @Test
    void windowResetsAfterAnHour() {
        long now = 1_000_000L;
        for (int i = 0; i < 3; i++) limiter.tryAcquire("user-1", now);
        assertThat(limiter.tryAcquire("user-1", now)).isFalse();

        long later = now + Duration.ofHours(1).toMillis();
        assertThat(limiter.tryAcquire("user-1", later)).isTrue();
    }

    @Test
    void zeroLimitDisablesThrottling() {
        limiter.setLimitPerHour(0);

        for (int i = 0; i < 100; i++) {
            assertThat(limiter.tryAcquire("user-1", 1_000L)).isTrue();
        }
    }
}
