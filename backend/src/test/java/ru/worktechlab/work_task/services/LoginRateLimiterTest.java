package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import ru.worktechlab.work_task.exceptions.TooManyRequestsException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * T-302: защита входа от перебора пароля.
 *
 * Самый важный тест здесь — {@link #spoofedForwardedForCannotResetTheBudget()}.
 * Заголовок {@code X-Forwarded-For} целиком подконтролен клиенту, и если брать
 * из него ПЕРВЫЙ адрес, злоумышленник получает новый бюджет на каждую попытку:
 * ограничение выключается полностью, продолжая выглядеть работающим — ровно
 * класс молчаливого отказа (**W-06**). nginx проекта проксирует с
 * {@code $proxy_add_x_forwarded_for}, который дописывает реальный адрес
 * в КОНЕЦ, поэтому доверять можно только последнему элементу.
 */
class LoginRateLimiterTest {

    private static final long T0 = 1_000_000L;

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
        limiter.setFailuresPerMinute(3);
    }

    private void fail(String key, long at) {
        limiter.recordFailure(key, at);
    }

    @Test
    void attemptsUnderTheLimitArePermitted() {
        fail("1.2.3.4", T0);
        fail("1.2.3.4", T0);

        assertThatCode(() -> limiter.checkAllowed("1.2.3.4", T0)).doesNotThrowAnyException();
    }

    @Test
    void limitReachedBlocksFurtherAttempts() {
        for (int i = 0; i < 3; i++) fail("1.2.3.4", T0);

        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4", T0))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessageContaining("Повторите через");
    }

    @Test
    void blockedResponseTellsWhenToRetry() {
        for (int i = 0; i < 3; i++) fail("1.2.3.4", T0);

        // Без Retry-After клиент либо бросает попытки, либо долбит в закрытый
        // эндпоинт: сообщение обязано быть действием, а не констатацией (K-34).
        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4", T0 + 20_000))
                .isInstanceOf(TooManyRequestsException.class)
                .extracting(e -> ((TooManyRequestsException) e).getRetryAfterSeconds())
                .isEqualTo(40L);
    }

    @Test
    void budgetIsPerAddressAndDoesNotLeakBetweenThem() {
        for (int i = 0; i < 3; i++) fail("1.2.3.4", T0);

        assertThatCode(() -> limiter.checkAllowed("5.6.7.8", T0)).doesNotThrowAnyException();
    }

    @Test
    void windowResetsAfterAMinute() {
        for (int i = 0; i < 3; i++) fail("1.2.3.4", T0);

        assertThatCode(() -> limiter.checkAllowed("1.2.3.4", T0 + 60_001))
                .doesNotThrowAnyException();
    }

    @Test
    void zeroLimitDisablesProtectionEntirely() {
        // Нужно, если проект окажется за балансировщиком без X-Forwarded-For:
        // выключить осознанно лучше, чем блокировать всех по одному адресу.
        limiter.setFailuresPerMinute(0);
        for (int i = 0; i < 100; i++) fail("1.2.3.4", T0);

        assertThatCode(() -> limiter.checkAllowed("1.2.3.4", T0)).doesNotThrowAnyException();
    }

    @Test
    void spoofedForwardedForCannotResetTheBudget() {
        // Клиент подставляет свой X-Forwarded-For; nginx ДОПИСЫВАЕТ настоящий
        // адрес в конец. Ключом обязан стать последний элемент — иначе каждая
        // попытка приходит «с нового адреса» и лимит не наступает никогда.
        MockHttpServletRequest first = new MockHttpServletRequest();
        first.addHeader("X-Forwarded-For", "9.9.9.9, 1.2.3.4");
        MockHttpServletRequest second = new MockHttpServletRequest();
        second.addHeader("X-Forwarded-For", "8.8.8.8, 1.2.3.4");

        assertThat(limiter.clientIp(first)).isEqualTo("1.2.3.4");
        assertThat(limiter.clientIp(second)).isEqualTo("1.2.3.4");
    }

    @Test
    void withoutProxyHeaderTheDirectAddressIsUsed() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.7");

        assertThat(limiter.clientIp(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void blankProxyHeaderFallsBackInsteadOfKeyingOnEmptyString() {
        // Пустой заголовок не должен схлопнуть всех клиентов в один ключ.
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "   ");
        request.setRemoteAddr("203.0.113.7");

        assertThat(limiter.clientIp(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void successfulLoginDoesNotSpendTheBudget() {
        // Бюджет тратят только неудачи: recordFailure не вызывается при успехе,
        // поэтому активный пользователь за общим NAT не блокирует коллег.
        for (int i = 0; i < 100; i++) {
            limiter.checkAllowed("1.2.3.4", T0);
        }

        assertThatCode(() -> limiter.checkAllowed("1.2.3.4", T0)).doesNotThrowAnyException();
    }
}
