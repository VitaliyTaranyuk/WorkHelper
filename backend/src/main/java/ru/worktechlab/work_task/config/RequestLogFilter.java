package ru.worktechlab.work_task.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * T-301: идентификатор запроса и строка доступа.
 *
 * <p><b>Зачем.</b> Паттерны в {@code logback-spring.xml} печатали {@code %X{rid}}
 * с самого начала проекта, но {@code MDC} не заполнял <b>никто</b> (проверено
 * поиском по всему {@code backend/src}) — то есть место под идентификатор в
 * каждой строке лога было, а идентификатора не было. Собрать строки одного
 * запроса было нечем, и жалоба «у меня не сохранилось» не сводилась к событиям
 * на сервере.
 *
 * <p><b>Порядок.</b> Фильтр стоит <b>перед</b> цепочкой Spring Security
 * ({@link SecurityProperties#DEFAULT_FILTER_ORDER} = -100), иначе отказы, которые
 * выдаёт сама цепочка — 401 без токена и 429 ограничителя входа (T-302), — не
 * попадали бы в лог вовсе. Именно они и интересны при разборе инцидента.
 *
 * <p><b>Идентификатор генерируется здесь, а не берётся из заголовка запроса.</b>
 * Это тот же урок, что и в T-302 с {@code X-Forwarded-For}: заголовок
 * подконтролен клиенту целиком, и принять его значит пустить в лог чужую строку
 * произвольной длины и содержания (включая перевод строки — подделку соседних
 * записей). Ответ несёт {@code X-Request-Id}, поэтому пользователь может
 * назвать код обращения, а он найдётся в логах.
 *
 * <p><b>Строка запроса (query) намеренно не логируется.</b> В ней ходят секреты:
 * токен комнаты Meet и общий токен вебхука мониторинга
 * ({@code /monitoring/alert?token=…}) — их место не в логе (K-33, K-36).
 */
@Slf4j
@Component
@Order(SecurityProperties.DEFAULT_FILTER_ORDER - 1)
public class RequestLogFilter extends OncePerRequestFilter {

    /** Возвращается клиенту: по нему обращение пользователя сводится с логом. */
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    public static final String MDC_REQUEST_ID = "rid";

    /**
     * Кладёт {@code AuthTokenFilter} (он единственный знает пользователя),
     * снимает — этот фильтр: он внешний, и его {@code finally} выполняется в
     * любом случае, в том числе когда запрос отвергнут цепочкой безопасности до
     * аутентификации.
     */
    public static final String MDC_USER_ID = "uid";

    private static final String MDC_METHOD = "method";
    private static final String MDC_PATH = "path";
    private static final String MDC_STATUS = "status";
    private static final String MDC_DURATION_MS = "ms";

    private static final String[] MDC_KEYS = {
            MDC_REQUEST_ID, MDC_USER_ID, MDC_METHOD, MDC_PATH, MDC_STATUS, MDC_DURATION_MS
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = newRequestId();
        long startedNanos = System.nanoTime();

        MDC.put(MDC_REQUEST_ID, requestId);
        MDC.put(MDC_METHOD, request.getMethod());
        MDC.put(MDC_PATH, request.getRequestURI());
        // Заголовок ставится ДО обработки: ответ может быть отправлен из
        // глубины цепочки, и добавить его после было бы уже некуда.
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos);
            MDC.put(MDC_STATUS, String.valueOf(response.getStatus()));
            MDC.put(MDC_DURATION_MS, String.valueOf(elapsedMs));
            // Одна строка на запрос: в текстовом логе она читается глазами, в
            // ECS-логе те же значения лежат отдельными полями (см. logback-spring.xml).
            log.info("{} {} -> {} за {} мс",
                    request.getMethod(), request.getRequestURI(), response.getStatus(), elapsedMs);
            clearMdc();
        }
    }

    /**
     * Короткий идентификатор: 12 шестнадцатеричных знаков вместо полного UUID.
     * Он попадает в каждую строку лога и в ответ клиенту, а различать нужно
     * запросы в пределах разбора инцидента, а не глобально и навсегда.
     */
    private String newRequestId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /**
     * MDC живёт в {@code ThreadLocal}, а потоки в пуле Tomcat переиспользуются:
     * не снятый ключ приписал бы следующему запросу чужой идентификатор и
     * чужого пользователя — молчаливо и правдоподобно.
     */
    private void clearMdc() {
        for (String key : MDC_KEYS) {
            MDC.remove(key);
        }
    }
}
