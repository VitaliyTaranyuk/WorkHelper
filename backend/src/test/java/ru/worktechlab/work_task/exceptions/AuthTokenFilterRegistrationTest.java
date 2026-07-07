package ru.worktechlab.work_task.exceptions;

import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.authorization.jwt.AuthTokenFilter;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ТП-182 (регресс «медленный вход»): AuthTokenFilter НЕ должен быть
 * @Component. С аннотацией Spring Boot регистрирует его вторым, обычным
 * servlet-фильтром (в дополнение к security-цепочке через addFilterBefore),
 * и каждый API-запрос дважды грузил пользователя из удалённой БД —
 * +~150мс латентности на каждый вызов. Бин создаёт только
 * SecurityConfig#authenticationJwtTokenFilter().
 */
class AuthTokenFilterRegistrationTest {

    @Test
    void authTokenFilterMustNotBeAComponent() {
        assertThat(AuthTokenFilter.class.isAnnotationPresent(Component.class))
                .as("@Component на AuthTokenFilter возвращает двойную регистрацию фильтра (двойной SQL на каждый запрос)")
                .isFalse();
    }
}
