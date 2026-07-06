package ru.worktechlab.work_task.ws.meet;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Сигналинг WorkTask Meet (ТП-162, ADR-012): переговорный канал WebRTC.
 * Сервер переправляет offer/answer/ice адресно (содержимое SDP не читает),
 * рассылает präсенс (join/leave/state), чат и host-команды. Протокол —
 * JSON-конверт {type, ...} (.ai/MEET_ARCHITECTURE.md §4).
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MeetSignalHandler extends TextWebSocketHandler {

    public static final String ATTR_AUTH = "meetAuth";

    private static final int MAX_CHAT_LENGTH = 2000;
    private static final int RATE_LIMIT_PER_SECOND = 60;
    private static final long STALE_SESSION_MS = 90_000;
    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int SEND_BUFFER_LIMIT = 512 * 1024;

    private final MeetRoomRegistry registry;
    private final ObjectMapper objectMapper;

    /** Слайдинг-окно rate-limit'а: sessionId → счётчик текущей секунды. */
    private final Map<String, RateWindow> rateWindows = new ConcurrentHashMap<>();

    private static class RateWindow {
        volatile long windowStart = System.currentTimeMillis();
        final AtomicInteger count = new AtomicInteger();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession rawSession) throws Exception {
        MeetSessionAuth auth = (MeetSessionAuth) rawSession.getAttributes().get(ATTR_AUTH);
        if (auth == null) {
            rawSession.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        WebSocketSession session = new ConcurrentWebSocketSessionDecorator(
                rawSession, SEND_TIME_LIMIT_MS, SEND_BUFFER_LIMIT);
        MeetRoomRegistry.JoinResult result =
                registry.join(auth, rawSession.getId(), session, auth.maxParticipants());

        if (result.refusal() != null) {
            String code = result.refusal() == MeetRoomRegistry.JoinRefusal.ROOM_FULL
                    ? "ROOM_FULL" : "REMOVED";
            String message = result.refusal() == MeetRoomRegistry.JoinRefusal.ROOM_FULL
                    ? "Встреча заполнена (максимум " + auth.maxParticipants() + " участников)"
                    : "Организатор удалил вас из этой встречи";
            send(session, error(code, message));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        send(session, hello(rawSession.getId(), auth, result));
        broadcastToOthers(auth.roomToken(), rawSession.getId(),
                peerEnvelope("peer-joined", peerOf(auth.roomToken(), rawSession.getId())));
        log.info("Meet WS: {} вошёл в комнату {} ({} участников)",
                auth.userId(), auth.roomToken(), registry.roomSize(auth.roomToken()));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        MeetSessionAuth auth = (MeetSessionAuth) session.getAttributes().get(ATTR_AUTH);
        if (auth == null)
            return;
        if (rateLimited(session.getId()))
            return;

        JsonNode envelope;
        try {
            envelope = objectMapper.readTree(message.getPayload());
        } catch (IOException e) {
            sendToSession(auth.roomToken(), session.getId(), error("BAD_MESSAGE", "Некорректное сообщение"));
            return;
        }
        String type = envelope.path("type").asText("");
        registry.peer(auth.roomToken(), session.getId()).ifPresent(MeetRoomRegistry.Peer::touch);

        switch (type) {
            case "offer", "answer", "ice" -> relay(auth, session.getId(), type, envelope);
            case "state" -> updateState(auth, session.getId(), envelope);
            case "chat" -> chat(auth, session.getId(), envelope);
            case "host-mute" -> hostMute(auth, session.getId(), envelope);
            case "host-remove" -> hostRemove(auth, session.getId(), envelope);
            case "ping" -> sendToSession(auth.roomToken(), session.getId(), simple("pong"));
            default -> sendToSession(auth.roomToken(), session.getId(),
                    error("BAD_MESSAGE", "Неизвестный тип: " + type));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        rateWindows.remove(session.getId());
        MeetSessionAuth auth = (MeetSessionAuth) session.getAttributes().get(ATTR_AUTH);
        if (auth == null)
            return;
        MeetRoomRegistry.LeaveResult result = registry.leave(auth.roomToken(), session.getId());
        if (result == null)
            return;
        ObjectNode left = simple("peer-left");
        left.put("sessionId", session.getId());
        left.put("reason", "left");
        broadcast(result.remaining(), left);
        if (result.newHostUserId() != null) {
            ObjectNode hostChanged = simple("host-changed");
            hostChanged.put("host", result.newHostUserId());
            broadcast(result.remaining(), hostChanged);
        }
        log.info("Meet WS: {} покинул комнату {} ({} осталось)",
                auth.userId(), auth.roomToken(), result.remaining().size());
    }

    /** Адресная переправка SDP/ICE: сервер добавляет отправителя, содержимое не читает. */
    private void relay(MeetSessionAuth auth, String senderId, String type, JsonNode envelope) {
        String target = envelope.path("to").asText("");
        registry.peer(auth.roomToken(), target).ifPresent(peer -> {
            ObjectNode out = ((ObjectNode) envelope).deepCopy();
            out.put("type", type);
            out.remove("to");
            out.put("from", senderId);
            send(peer.getSession(), out);
        });
    }

    private void updateState(MeetSessionAuth auth, String sessionId, JsonNode envelope) {
        registry.peer(auth.roomToken(), sessionId).ifPresent(peer -> {
            peer.updateState(
                    envelope.has("muted") ? envelope.get("muted").asBoolean() : null,
                    envelope.has("cameraOn") ? envelope.get("cameraOn").asBoolean() : null,
                    envelope.has("screenSharing") ? envelope.get("screenSharing").asBoolean() : null);
            ObjectNode out = simple("state");
            out.put("sessionId", sessionId);
            out.put("muted", peer.isMuted());
            out.put("cameraOn", peer.isCameraOn());
            out.put("screenSharing", peer.isScreenSharing());
            broadcastToOthers(auth.roomToken(), sessionId, out);
        });
    }

    /** Чат встречи — эфемерный (§6 ADR): рассылается всем, включая отправителя (единый порядок). */
    private void chat(MeetSessionAuth auth, String sessionId, JsonNode envelope) {
        String text = envelope.path("text").asText("");
        if (text.isBlank() || text.length() > MAX_CHAT_LENGTH) {
            sendToSession(auth.roomToken(), sessionId,
                    error("BAD_MESSAGE", "Сообщение пустое или длиннее " + MAX_CHAT_LENGTH + " символов"));
            return;
        }
        ObjectNode out = simple("chat");
        out.put("sessionId", sessionId);
        out.put("name", auth.displayName());
        out.put("text", text);
        out.put("at", System.currentTimeMillis());
        broadcast(registry.peers(auth.roomToken()), out);
    }

    /** Host просит участника замолчать: команда доставляется цели, self-mute делает её клиент. */
    private void hostMute(MeetSessionAuth auth, String senderId, JsonNode envelope) {
        if (!isHost(auth, senderId))
            return;
        String target = envelope.path("target").asText("");
        sendToSession(auth.roomToken(), target, simple("host-mute"));
    }

    /** Host удаляет участника: бан userId до конца сессии комнаты + закрытие соединения. */
    private void hostRemove(MeetSessionAuth auth, String senderId, JsonNode envelope) {
        if (!isHost(auth, senderId))
            return;
        String targetId = envelope.path("target").asText("");
        registry.peer(auth.roomToken(), targetId).ifPresent(target -> {
            if (Objects.equals(target.getUserId(), auth.userId()))
                return; // сам себя host не удаляет
            registry.ban(auth.roomToken(), target.getUserId());
            ObjectNode left = simple("peer-left");
            left.put("sessionId", targetId);
            left.put("reason", "removed");
            // Сначала уведомляем всех (включая цель), затем закрываем её сессию:
            // цель получает понятную причину, а не просто обрыв.
            broadcast(registry.peers(auth.roomToken()), left);
            closeQuietly(target.getSession());
            log.info("Meet WS: host {} удалил {} из комнаты {}",
                    auth.userId(), target.getUserId(), auth.roomToken());
        });
    }

    private boolean isHost(MeetSessionAuth auth, String sessionId) {
        String host = registry.effectiveHost(auth.roomToken());
        return host != null && registry.peer(auth.roomToken(), sessionId)
                .map(p -> host.equals(p.getUserId()))
                .orElse(false);
    }

    /** Сессии без признаков жизни (нет ping) закрываются — не остаётся плиток-призраков. */
    @Scheduled(fixedRate = 60_000)
    public void sweepStaleSessions() {
        for (MeetRoomRegistry.Peer peer : registry.stalePeers(STALE_SESSION_MS)) {
            log.info("Meet WS: закрываю зависшую сессию {} (нет ping)", peer.getSessionId());
            closeQuietly(peer.getSession());
        }
    }

    private boolean rateLimited(String sessionId) {
        RateWindow window = rateWindows.computeIfAbsent(sessionId, id -> new RateWindow());
        long now = System.currentTimeMillis();
        if (now - window.windowStart > 1000) {
            window.windowStart = now;
            window.count.set(0);
        }
        return window.count.incrementAndGet() > RATE_LIMIT_PER_SECOND;
    }

    private ObjectNode hello(String selfId, MeetSessionAuth auth, MeetRoomRegistry.JoinResult result) {
        ObjectNode hello = simple("hello");
        hello.put("self", selfId);
        hello.put("selfUserId", auth.userId());
        hello.put("host", result.hostUserId());
        hello.put("roomTitle", auth.roomTitle());
        hello.put("maxParticipants", auth.maxParticipants());
        hello.set("peers", objectMapper.valueToTree(
                result.others().stream().map(this::peerJson).toList()));
        return hello;
    }

    private ObjectNode peerEnvelope(String type, Map<String, Object> peer) {
        ObjectNode node = simple(type);
        node.set("peer", objectMapper.valueToTree(peer));
        return node;
    }

    private Map<String, Object> peerOf(String roomToken, String sessionId) {
        return registry.peer(roomToken, sessionId).map(this::peerJson).orElse(Map.of());
    }

    private Map<String, Object> peerJson(MeetRoomRegistry.Peer peer) {
        return Map.of(
                "sessionId", peer.getSessionId(),
                "userId", peer.getUserId(),
                "name", peer.getName(),
                "username", peer.getUsername() != null ? peer.getUsername() : "",
                "muted", peer.isMuted(),
                "cameraOn", peer.isCameraOn(),
                "screenSharing", peer.isScreenSharing(),
                "joinedAt", peer.getJoinedAt());
    }

    private ObjectNode simple(String type) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", type);
        return node;
    }

    private ObjectNode error(String code, String message) {
        ObjectNode node = simple("error");
        node.put("code", code);
        node.put("message", message);
        return node;
    }

    private void broadcastToOthers(String roomToken, String exceptSessionId, ObjectNode message) {
        for (MeetRoomRegistry.Peer peer : registry.peers(roomToken))
            if (!peer.getSessionId().equals(exceptSessionId))
                send(peer.getSession(), message);
    }

    private void broadcast(List<MeetRoomRegistry.Peer> peers, ObjectNode message) {
        for (MeetRoomRegistry.Peer peer : peers)
            send(peer.getSession(), message);
    }

    private void sendToSession(String roomToken, String sessionId, ObjectNode message) {
        registry.peer(roomToken, sessionId).ifPresent(peer -> send(peer.getSession(), message));
    }

    private void send(WebSocketSession session, ObjectNode message) {
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException | IllegalStateException e) {
            log.debug("Meet WS: не удалось отправить сообщение ({})", e.getMessage());
        }
    }

    private void closeQuietly(WebSocketSession session) {
        try {
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (IOException ignored) {
            // сессия уже закрыта
        }
    }
}
