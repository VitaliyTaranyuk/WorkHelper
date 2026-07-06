package ru.worktechlab.work_task.ws.meet;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Эфемерное состояние комнат Meet (ADR-013): подключённые участники, их
 * медиа-präсенс и баны текущей сессии комнаты. Живёт в памяти единственной
 * ноды; при рестарте клиенты переподключаются и комната собирается заново.
 * Все операции над комнатой атомарны (монитор объекта Room).
 */
@Component
@Slf4j
public class MeetRoomRegistry {

    /** Подключённый участник (одна WebSocket-сессия; один пользователь может войти дважды). */
    @Getter
    public static class Peer {
        private final String sessionId;
        private final WebSocketSession session;
        private final String userId;
        private final String name;
        private final String username;
        private final long joinedAt;
        private volatile boolean muted;
        private volatile boolean cameraOn;
        private volatile boolean screenSharing;
        private volatile long lastSeenAt;

        Peer(String sessionId, WebSocketSession session, String userId, String name, String username) {
            this.sessionId = sessionId;
            this.session = session;
            this.userId = userId;
            this.name = name;
            this.username = username;
            this.joinedAt = System.currentTimeMillis();
            this.lastSeenAt = this.joinedAt;
            this.cameraOn = true;
        }

        void updateState(Boolean muted, Boolean cameraOn, Boolean screenSharing) {
            if (muted != null) this.muted = muted;
            if (cameraOn != null) this.cameraOn = cameraOn;
            if (screenSharing != null) this.screenSharing = screenSharing;
        }

        void touch() {
            this.lastSeenAt = System.currentTimeMillis();
        }
    }

    /** Состояние комнаты; порядок peers — порядок входа (для передачи host-роли). */
    public static class Room {
        @Getter private final String roomToken;
        @Getter private final String creatorUserId;
        private final Map<String, Peer> peers = new LinkedHashMap<>();
        private final Set<String> bannedUserIds = new HashSet<>();

        Room(String roomToken, String creatorUserId) {
            this.roomToken = roomToken;
            this.creatorUserId = creatorUserId;
        }
    }

    public enum JoinRefusal { ROOM_FULL, REMOVED }

    /** Результат попытки входа: либо отказ, либо снапшот остальных участников. */
    public record JoinResult(JoinRefusal refusal, List<Peer> others, String hostUserId) {
        static JoinResult refused(JoinRefusal refusal) {
            return new JoinResult(refusal, List.of(), null);
        }
    }

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public JoinResult join(MeetSessionAuth auth, String sessionId, WebSocketSession session, int maxParticipants) {
        Room room = rooms.computeIfAbsent(auth.roomToken(),
                token -> new Room(token, auth.creatorUserId()));
        synchronized (room) {
            if (room.bannedUserIds.contains(auth.userId()))
                return JoinResult.refused(JoinRefusal.REMOVED);
            if (room.peers.size() >= maxParticipants)
                return JoinResult.refused(JoinRefusal.ROOM_FULL);
            Peer peer = new Peer(sessionId, session, auth.userId(), auth.displayName(), auth.username());
            room.peers.put(sessionId, peer);
            List<Peer> others = room.peers.values().stream()
                    .filter(p -> !p.getSessionId().equals(sessionId))
                    .toList();
            return new JoinResult(null, others, effectiveHost(room));
        }
    }

    /** Удаление сессии; возвращает нового host, если он сменился (иначе null). */
    public record LeaveResult(Peer removed, List<Peer> remaining, String newHostUserId) {}

    public LeaveResult leave(String roomToken, String sessionId) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return null;
        synchronized (room) {
            String hostBefore = effectiveHost(room);
            Peer removed = room.peers.remove(sessionId);
            if (removed == null)
                return null;
            if (room.peers.isEmpty()) {
                rooms.remove(roomToken);
                return new LeaveResult(removed, List.of(), null);
            }
            String hostAfter = effectiveHost(room);
            return new LeaveResult(removed, List.copyOf(room.peers.values()),
                    hostAfter != null && !hostAfter.equals(hostBefore) ? hostAfter : null);
        }
    }

    /** Забанить пользователя до конца сессии комнаты (host-remove). */
    public void ban(String roomToken, String userId) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return;
        synchronized (room) {
            room.bannedUserIds.add(userId);
        }
    }

    public Optional<Peer> peer(String roomToken, String sessionId) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return Optional.empty();
        synchronized (room) {
            return Optional.ofNullable(room.peers.get(sessionId));
        }
    }

    public List<Peer> peers(String roomToken) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return List.of();
        synchronized (room) {
            return List.copyOf(room.peers.values());
        }
    }

    /**
     * Действующий host (ADR-014): создатель комнаты, если он подключён,
     * иначе самый ранний из подключённых.
     */
    public String effectiveHost(String roomToken) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return null;
        synchronized (room) {
            return effectiveHost(room);
        }
    }

    private String effectiveHost(Room room) {
        if (room.peers.isEmpty())
            return null;
        boolean creatorPresent = room.peers.values().stream()
                .anyMatch(p -> p.getUserId().equals(room.creatorUserId));
        if (creatorPresent)
            return room.creatorUserId;
        return room.peers.values().stream()
                .min(Comparator.comparingLong(Peer::getJoinedAt))
                .map(Peer::getUserId)
                .orElse(null);
    }

    /** Сессии, не подававшие признаков жизни дольше таймаута (для sweeper'а). */
    public List<Peer> stalePeers(long olderThanMs) {
        long threshold = System.currentTimeMillis() - olderThanMs;
        List<Peer> stale = new ArrayList<>();
        for (Room room : rooms.values())
            synchronized (room) {
                for (Peer peer : room.peers.values())
                    if (peer.getLastSeenAt() < threshold)
                        stale.add(peer);
            }
        return stale;
    }

    /** Число подключённых (для метрик/логов). */
    public int roomSize(String roomToken) {
        Room room = rooms.get(roomToken);
        if (room == null)
            return 0;
        synchronized (room) {
            return room.peers.size();
        }
    }
}
