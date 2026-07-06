package ru.worktechlab.work_task.ws.meet;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * Handshake-авторизация сигналинга Meet: JWT и токен комнаты приходят в query
 * (браузерный WebSocket не поддерживает заголовки). Ошибка — HTTP-статус до
 * upgrade'а; успешная авторизация кладёт MeetSessionAuth в атрибуты сессии.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MeetHandshakeInterceptor implements HandshakeInterceptor {

    private final MeetAccessService meetAccessService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        MultiValueMap<String, String> query =
                UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
        String jwt = query.getFirst("token");
        String roomToken = query.getFirst("room");
        if (jwt == null || roomToken == null) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return false;
        }
        try {
            attributes.put(MeetSignalHandler.ATTR_AUTH, meetAccessService.authorize(jwt, roomToken));
            return true;
        } catch (Exception e) {
            log.info("Meet WS: handshake отклонён ({})", e.getMessage());
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // ничего: авторизация полностью в beforeHandshake
    }
}
