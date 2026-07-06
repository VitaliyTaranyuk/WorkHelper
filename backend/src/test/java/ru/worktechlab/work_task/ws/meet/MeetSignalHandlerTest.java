package ru.worktechlab.work_task.ws.meet;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * ТП-162: протокол сигналинга Meet на уровне хендлера — два и более клиентов
 * (мок-сессии) проходят полный цикл: hello/peer-joined, адресный relay
 * offer/answer/ice, präсенс, чат, host-контролы, лимит комнаты, бан.
 */
class MeetSignalHandlerTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private MeetRoomRegistry registry;
    private MeetSignalHandler handler;

    /** Отправленные сессии сообщения, разобранные в JsonNode. */
    private final Map<String, List<JsonNode>> outbox = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        registry = new MeetRoomRegistry();
        handler = new MeetSignalHandler(registry, mapper);
        outbox.clear();
    }

    private MeetSessionAuth auth(String userId, String name, int max) {
        return new MeetSessionAuth(userId, name, userId + "_nick",
                "room-1", "Планёрка", "project-1", "creator-1", max);
    }

    private WebSocketSession sessionMock(String id, MeetSessionAuth auth) throws Exception {
        WebSocketSession session = Mockito.mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(MeetSignalHandler.ATTR_AUTH, auth);
        when(session.getId()).thenReturn(id);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        outbox.put(id, new ArrayList<>());
        doAnswer(invocation -> {
            TextMessage message = invocation.getArgument(0);
            outbox.get(id).add(mapper.readTree(message.getPayload()));
            return null;
        }).when(session).sendMessage(any(TextMessage.class));
        return session;
    }

    private List<JsonNode> sent(String sessionId, String type) {
        return outbox.get(sessionId).stream()
                .filter(n -> type.equals(n.path("type").asText()))
                .toList();
    }

    @Test
    void twoClients_seeEachOther_helloAndPeerJoined() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));

        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        JsonNode aliceHello = sent("s-alice", "hello").get(0);
        assertThat(aliceHello.get("self").asText()).isEqualTo("s-alice");
        assertThat(aliceHello.get("peers")).isEmpty();
        assertThat(aliceHello.get("host").asText()).isEqualTo("creator-1");

        JsonNode bobHello = sent("s-bob", "hello").get(0);
        assertThat(bobHello.get("peers")).hasSize(1);
        assertThat(bobHello.get("peers").get(0).get("sessionId").asText()).isEqualTo("s-alice");

        List<JsonNode> joined = sent("s-alice", "peer-joined");
        assertThat(joined).hasSize(1);
        assertThat(joined.get(0).get("peer").get("sessionId").asText()).isEqualTo("s-bob");
        assertThat(joined.get(0).get("peer").get("name").asText()).isEqualTo("Боб");
    }

    @Test
    void offer_isRelayedOnlyToTarget_withSenderAttached() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        WebSocketSession carol = sessionMock("s-carol", auth("user-carol", "Кэрол", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);
        handler.afterConnectionEstablished(carol);

        handler.handleTextMessage(bob, new TextMessage(
                "{\"type\":\"offer\",\"to\":\"s-alice\",\"sdp\":{\"type\":\"offer\",\"sdp\":\"v=0...\"}}"));

        List<JsonNode> offers = sent("s-alice", "offer");
        assertThat(offers).hasSize(1);
        assertThat(offers.get(0).get("from").asText()).isEqualTo("s-bob");
        assertThat(offers.get(0).has("to")).isFalse();
        assertThat(offers.get(0).get("sdp").get("sdp").asText()).isEqualTo("v=0...");
        assertThat(sent("s-carol", "offer")).isEmpty();
    }

    @Test
    void state_isBroadcastToOthers() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        handler.handleTextMessage(alice, new TextMessage("{\"type\":\"state\",\"muted\":true}"));

        List<JsonNode> states = sent("s-bob", "state");
        assertThat(states).hasSize(1);
        assertThat(states.get(0).get("sessionId").asText()).isEqualTo("s-alice");
        assertThat(states.get(0).get("muted").asBoolean()).isTrue();
        assertThat(states.get(0).get("cameraOn").asBoolean()).isTrue();
    }

    @Test
    void chat_reachesEveryoneIncludingSender() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        handler.handleTextMessage(bob, new TextMessage("{\"type\":\"chat\",\"text\":\"Привет!\"}"));

        for (String sid : List.of("s-alice", "s-bob")) {
            List<JsonNode> chats = sent(sid, "chat");
            assertThat(chats).hasSize(1);
            assertThat(chats.get(0).get("text").asText()).isEqualTo("Привет!");
            assertThat(chats.get(0).get("name").asText()).isEqualTo("Боб");
        }
    }

    @Test
    void roomFull_isRefusedWithError() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 2));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 2));
        WebSocketSession carol = sessionMock("s-carol", auth("user-carol", "Кэрол", 2));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);
        handler.afterConnectionEstablished(carol);

        List<JsonNode> errors = sent("s-carol", "error");
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).get("code").asText()).isEqualTo("ROOM_FULL");
        verify(carol).close(CloseStatus.POLICY_VIOLATION);
        assertThat(registry.roomSize("room-1")).isEqualTo(2);
    }

    @Test
    void hostRemove_bansUser_andBlocksRejoin() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        handler.handleTextMessage(alice, new TextMessage(
                "{\"type\":\"host-remove\",\"target\":\"s-bob\"}"));

        List<JsonNode> left = sent("s-bob", "peer-left");
        assertThat(left).hasSize(1);
        assertThat(left.get(0).get("reason").asText()).isEqualTo("removed");
        verify(bob).close(CloseStatus.POLICY_VIOLATION);

        // Повторный вход забаненного отклоняется до конца сессии комнаты
        WebSocketSession bobAgain = sessionMock("s-bob2", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(bobAgain);
        List<JsonNode> errors = sent("s-bob2", "error");
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).get("code").asText()).isEqualTo("REMOVED");
    }

    @Test
    void hostCommands_fromNonHost_areIgnored() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        handler.handleTextMessage(bob, new TextMessage(
                "{\"type\":\"host-remove\",\"target\":\"s-alice\"}"));
        handler.handleTextMessage(bob, new TextMessage(
                "{\"type\":\"host-mute\",\"target\":\"s-alice\"}"));

        assertThat(sent("s-alice", "peer-left")).isEmpty();
        assertThat(sent("s-alice", "host-mute")).isEmpty();
        verify(alice, never()).close(any());
    }

    @Test
    void hostMute_fromHost_reachesTarget() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);

        handler.handleTextMessage(alice, new TextMessage(
                "{\"type\":\"host-mute\",\"target\":\"s-bob\"}"));

        assertThat(sent("s-bob", "host-mute")).hasSize(1);
    }

    @Test
    void leave_broadcastsPeerLeft_andTransfersHost() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        WebSocketSession bob = sessionMock("s-bob", auth("user-bob", "Боб", 8));
        WebSocketSession carol = sessionMock("s-carol", auth("user-carol", "Кэрол", 8));
        handler.afterConnectionEstablished(alice);
        handler.afterConnectionEstablished(bob);
        handler.afterConnectionEstablished(carol);

        // Уходит создатель (host) — host переходит к самому раннему (Боб)
        handler.afterConnectionClosed(alice, CloseStatus.NORMAL);

        List<JsonNode> bobLeft = sent("s-bob", "peer-left");
        assertThat(bobLeft).hasSize(1);
        assertThat(bobLeft.get(0).get("sessionId").asText()).isEqualTo("s-alice");
        assertThat(bobLeft.get(0).get("reason").asText()).isEqualTo("left");

        List<JsonNode> hostChanged = sent("s-carol", "host-changed");
        assertThat(hostChanged).hasSize(1);
        assertThat(hostChanged.get(0).get("host").asText()).isEqualTo("user-bob");
    }

    @Test
    void ping_getsPong_andUnknownType_getsError() throws Exception {
        WebSocketSession alice = sessionMock("s-alice", auth("creator-1", "Алиса", 8));
        handler.afterConnectionEstablished(alice);

        handler.handleTextMessage(alice, new TextMessage("{\"type\":\"ping\"}"));
        handler.handleTextMessage(alice, new TextMessage("{\"type\":\"nonsense\"}"));

        assertThat(sent("s-alice", "pong")).hasSize(1);
        List<JsonNode> errors = sent("s-alice", "error");
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).get("code").asText()).isEqualTo("BAD_MESSAGE");
    }

    @Test
    void sameUser_twoTabs_areTwoIndependentPeers() throws Exception {
        WebSocketSession tab1 = sessionMock("s-t1", auth("user-bob", "Боб", 8));
        WebSocketSession tab2 = sessionMock("s-t2", auth("user-bob", "Боб", 8));
        handler.afterConnectionEstablished(tab1);
        handler.afterConnectionEstablished(tab2);

        assertThat(registry.roomSize("room-1")).isEqualTo(2);
        assertThat(sent("s-t2", "hello").get(0).get("peers")).hasSize(1);
    }
}
