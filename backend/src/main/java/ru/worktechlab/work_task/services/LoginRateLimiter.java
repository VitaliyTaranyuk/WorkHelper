package ru.worktechlab.work_task.services;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.exceptions.TooManyRequestsException;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * T-302: защита входа от перебора пароля.
 *
 * Считаются <b>только неудачные</b> попытки, и это главное отличие от
 * {@link VoiceEnhancementRateLimiter}, чью форму этот класс повторяет (K-38).
 * Причины:
 * <ul>
 *   <li>перебор по определению состоит из неудач, поэтому бюджет тратит именно он;</li>
 *   <li>офис за одним NAT-адресом иначе блокировал бы сам себя: десяток
 *       сотрудников, входящих утром, выглядят с сервера как один IP.</li>
 * </ul>
 *
 * Превышение — <b>отказ</b>, а не молчаливый пропуск. Здесь это обратное
 * решение к голосовому лимитеру, где превышение честно отдаёт фолбэк: там
 * механизм страхует расход денег, здесь — закрывает вход.
 *
 * Реализация in-memory и попроцессная, как и у голосового: бэкенд
 * разворачивается одним экземпляром (`docker-compose.vds.yml`). Оговорка про
 * окно: счётчик фиксированный, поэтому на стыке двух окон теоретически
 * проходит до 2×limit попыток. Для защиты от перебора это приемлемо —
 * скользящее окно потребовало бы хранить отметки каждой попытки, а выигрыш
 * измеряется в единицах запросов.
 */
@Component
@Slf4j
public class LoginRateLimiter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    /**
     * Порог намеренно щедрый для человека и тесный для перебора: 10 неудач
     * в минуту с одного адреса — это 600 в час, тогда как человек, забывший
     * пароль, укладывается в единицы. 0 или меньше выключает ограничение.
     */
    @Value("${app.auth.login-failures-per-minute:10}")
    private int failuresPerMinute;

    private record Window(long startedAtMs, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * Бросает, если с адреса уже накоплен лимит неудач. Вызывается ДО попытки
     * аутентификации: смысл в том, чтобы не проверять пароль вовсе.
     */
    public void checkAllowed(HttpServletRequest request) {
        checkAllowed(clientIp(request), System.currentTimeMillis());
    }

    /** Учитывает неудачную попытку. Успешный вход бюджет не расходует. */
    public void recordFailure(HttpServletRequest request) {
        recordFailure(clientIp(request), System.currentTimeMillis());
    }

    void checkAllowed(String key, long nowMs) {
        if (failuresPerMinute <= 0) return;
        Window current = windows.get(key);
        if (current == null || nowMs - current.startedAtMs() >= WINDOW.toMillis()) return;
        if (current.count() >= failuresPerMinute) {
            long left = (WINDOW.toMillis() - (nowMs - current.startedAtMs()) + 999) / 1000;
            log.warn("Вход заблокирован ограничением: адрес={} неудач={}", key, current.count());
            throw new TooManyRequestsException(
                    "Слишком много неудачных попыток входа. Повторите через " + left + " с.", left);
        }
    }

    void recordFailure(String key, long nowMs) {
        if (failuresPerMinute <= 0) return;
        windows.compute(key, (k, current) -> {
            if (current == null || nowMs - current.startedAtMs() >= WINDOW.toMillis()) {
                return new Window(nowMs, 1);
            }
            return new Window(current.startedAtMs(), current.count() + 1);
        });
    }

    /**
     * Адрес клиента.
     *
     * <p><b>Берётся ПОСЛЕДНИЙ элемент {@code X-Forwarded-For}, а не первый —
     * и это не стилистика.</b> nginx проекта проксирует с
     * {@code $proxy_add_x_forwarded_for} (`infra/nginx-vds.conf`), который
     * <i>дописывает</i> реальный {@code $remote_addr} в конец к тому, что
     * прислал клиент. Заголовок целиком подконтролен клиенту, доверять можно
     * только последнему элементу — его добавил наш прокси.
     *
     * <p>Если брать первый, злоумышленник подставляет любой
     * {@code X-Forwarded-For} и получает новый бюджет на каждую попытку, то
     * есть ограничение выключается полностью и при этом выглядит работающим —
     * ровно класс молчаливого отказа (**W-06**).
     */
    String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            String last = parts[parts.length - 1].trim();
            if (!last.isEmpty()) return last;
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    void setFailuresPerMinute(int failuresPerMinute) {
        this.failuresPerMinute = failuresPerMinute;
    }
}
