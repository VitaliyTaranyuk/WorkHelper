package ru.worktechlab.work_task.ws;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;
import ru.worktechlab.work_task.ws.meet.MeetHandshakeInterceptor;
import ru.worktechlab.work_task.ws.meet.MeetSignalHandler;

import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Общий WebSocket-слой WorkTask (ADR-012): вводится для сигналинга Meet,
 * пригоден для будущих realtime-потребителей (доска, уведомления) — новые
 * эндпоинты добавляются регистрацией, без правки существующих.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WsConfig implements WebSocketConfigurer {

    public static final String MEET_PATH = "/work-task/ws/meet";

    private final MeetSignalHandler meetSignalHandler;
    private final MeetHandshakeInterceptor meetHandshakeInterceptor;

    @Value("${spring.cors.allowed.origins}")
    private String allowedOrigins;

    @Value("${spring.cors.allowed.local}")
    private String allowedLocal;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(meetSignalHandler, MEET_PATH)
                .addInterceptors(meetHandshakeInterceptor)
                .setAllowedOrigins(origins());
    }

    /** Те же origin'ы, что у REST CORS (SecurityConfig) — единый источник настройки. */
    private String[] origins() {
        return Stream.of(allowedOrigins, allowedLocal)
                .filter(Objects::nonNull)
                .flatMap(v -> Arrays.stream(v.split(",")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    /**
     * SDP-оффер с большим числом ICE-кандидатов легко превышает дефолтные 8KB —
     * поднимаем лимит текстового сообщения (медиа по WS не ходит, только сигналинг).
     */
    @Bean
    public ServletServerContainerFactoryBean wsContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(64 * 1024);
        container.setMaxBinaryMessageBufferSize(64 * 1024);
        return container;
    }
}
