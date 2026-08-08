package ru.worktechlab.work_task.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.annotation.Order;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * T-301. Проверяется не «фильтр вызвался», а четыре свойства, каждое из
 * которых при поломке отказывает молча:
 *
 * <ul>
 *   <li>идентификатор запроса действительно попадает в MDC — до этой задачи
 *       {@code %X{rid}} в паттернах лога был пуст всегда;</li>
 *   <li>MDC снимается после запроса — иначе поток из пула Tomcat приписал бы
 *       следующему запросу чужого пользователя, и лог выглядел бы исправным;</li>
 *   <li>идентификатор из заголовка клиента игнорируется (урок T-302 про
 *       {@code X-Forwarded-For});</li>
 *   <li>строка запроса не логируется — в ней ходят токены.</li>
 * </ul>
 */
class RequestLogFilterTest {

    private final RequestLogFilter filter = new RequestLogFilter();

    private ListAppender<ILoggingEvent> appender;
    private Logger filterLogger;

    @BeforeEach
    void captureLog() {
        filterLogger = (Logger) LoggerFactory.getLogger(RequestLogFilter.class);
        filterLogger.setLevel(Level.INFO);
        appender = new ListAppender<>();
        appender.start();
        filterLogger.addAppender(appender);
        MDC.clear();
    }

    @AfterEach
    void releaseLog() {
        filterLogger.detachAppender(appender);
        MDC.clear();
    }

    @Test
    void putsRequestIdIntoMdcAndReturnsItToClient() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/work-task/api/v1/tasks");
        MockHttpServletResponse response = new MockHttpServletResponse();
        String[] seenInsideChain = new String[1];

        filter.doFilter(request, response, (req, res) -> seenInsideChain[0] = MDC.get(RequestLogFilter.MDC_REQUEST_ID));

        assertThat(seenInsideChain[0])
                .as("во время обработки запроса идентификатор обязан быть в MDC — иначе %X{rid} в логе пуст")
                .isNotBlank();
        assertThat(response.getHeader(RequestLogFilter.REQUEST_ID_HEADER))
                .as("пользователь должен получить код обращения, по которому запрос находится в логе")
                .isEqualTo(seenInsideChain[0]);
    }

    @Test
    void clearsMdcAfterRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/work-task/api/v1/tasks");

        filter.doFilter(request, new MockHttpServletResponse(),
                // uid кладёт AuthTokenFilter изнутри цепочки — снять его обязан
                // именно внешний фильтр.
                (req, res) -> MDC.put(RequestLogFilter.MDC_USER_ID, "user-guid"));

        assertThat(MDC.getCopyOfContextMap())
                .as("остаток в MDC достанется следующему запросу этого потока — чужой uid в логе неотличим от настоящего")
                .satisfiesAnyOf(
                        map -> assertThat(map).isNull(),
                        map -> assertThat(map).isEmpty());
    }

    @Test
    void clearsMdcWhenChainFails() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/work-task/api/v1/tasks");

        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            throw new ServletException("упало внутри");
        })).isInstanceOf(ServletException.class);

        assertThat(MDC.get(RequestLogFilter.MDC_REQUEST_ID))
                .as("ошибка обработки не отменяет уборку: иначе поток уносит идентификатор в следующий запрос")
                .isNull();
    }

    @Test
    void logsOneLineWithMethodPathStatusAndDuration() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/work-task/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) -> ((MockHttpServletResponse) res).setStatus(429));

        List<ILoggingEvent> events = appender.list;
        assertThat(events).hasSize(1);
        ILoggingEvent event = events.get(0);

        assertThat(event.getFormattedMessage())
                .contains("POST", "/work-task/api/v1/auth/login", "429");
        assertThat(event.getMDCPropertyMap())
                .as("в структурированном логе те же значения обязаны быть полями, а не только текстом")
                .containsKeys("rid", "method", "path", "status", "ms")
                .containsEntry("status", "429");
    }

    @Test
    void ignoresRequestIdSuppliedByClient() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/work-task/api/v1/tasks");
        request.addHeader(RequestLogFilter.REQUEST_ID_HEADER, "подделка\nfake log line");
        MockHttpServletResponse response = new MockHttpServletResponse();
        String[] seenInsideChain = new String[1];

        filter.doFilter(request, response, (req, res) -> seenInsideChain[0] = MDC.get(RequestLogFilter.MDC_REQUEST_ID));

        assertThat(seenInsideChain[0])
                .as("заголовок подконтролен клиенту: приняв его, мы пустили бы в лог чужую строку с переводом строки")
                .doesNotContain("подделка")
                .doesNotContain("\n");
        assertThat(response.getHeader(RequestLogFilter.REQUEST_ID_HEADER)).isEqualTo(seenInsideChain[0]);
    }

    @Test
    void doesNotLogQueryString() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/work-task/api/v1/monitoring/alert");
        request.setQueryString("token=super-secret-value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, emptyChain());

        assertThat(appender.list.get(0).getFormattedMessage())
                .as("в query ходят токен вебхука мониторинга и токен комнаты Meet — в логе им не место (K-33)")
                .doesNotContain("super-secret-value");
        assertThat(appender.list.get(0).getMDCPropertyMap().get("path"))
                .doesNotContain("super-secret-value");
    }

    /**
     * Порядок — часть функциональности, а не деталь регистрации: за цепочкой
     * безопасности остаются 401 без токена и 429 ограничителя входа (T-302),
     * то есть ровно те ответы, ради которых лог и читают.
     */
    @Test
    void runsBeforeSpringSecurityFilterChain() {
        Order order = RequestLogFilter.class.getAnnotation(Order.class);

        assertThat(order)
                .as("без явного порядка фильтр встанет после security — отказы цепочки не попадут в лог")
                .isNotNull();
        assertThat(order.value()).isLessThan(SecurityProperties.DEFAULT_FILTER_ORDER);
    }

    private FilterChain emptyChain() {
        return (req, res) -> {
        };
    }
}
