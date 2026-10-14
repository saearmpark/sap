package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class GameWebSocketHandlerTest {
    @Test
    void restoresRoomAndBoardAfterHandlerRestart() throws Exception {
        AuthService auth = mock(AuthService.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        GameRoomSnapshotRepository snapshots = mock(GameRoomSnapshotRepository.class);
        Map<String, GameRoomSnapshot> stored = new ConcurrentHashMap<>();
        when(snapshots.findAll()).thenAnswer(ignored -> new ArrayList<>(stored.values()));
        when(snapshots.save(any(GameRoomSnapshot.class))).thenAnswer(invocation -> {
            GameRoomSnapshot snapshot = invocation.getArgument(0);
            snapshot.touch();
            stored.put(snapshot.getCode(), snapshot);
            return snapshot;
        });
        doAnswer(invocation -> {
            stored.remove(invocation.getArgument(0));
            return null;
        }).when(snapshots).deleteById(any(String.class));

        UserAccount playerX = mock(UserAccount.class);
        when(playerX.getId()).thenReturn(1L);
        when(playerX.getDisplayName()).thenReturn("Player X");
        when(playerX.isApproved()).thenReturn(true);
        UserAccount playerO = mock(UserAccount.class);
        when(playerO.getId()).thenReturn(2L);
        when(playerO.getDisplayName()).thenReturn("Player O");
        when(playerO.isApproved()).thenReturn(true);
        when(auth.identityForToken("token-x")).thenReturn(new AuthService.UserIdentity(1L, false));
        when(auth.identityForToken("token-o")).thenReturn(new AuthService.UserIdentity(2L, false));
        when(users.findById(1L)).thenReturn(Optional.of(playerX));
        when(users.findById(2L)).thenReturn(Optional.of(playerO));

        TestHandler firstServer = new TestHandler(auth, users, snapshots);
        WebSocketSession sessionX = session();
        WebSocketSession sessionO = session();
        firstServer.authenticate(sessionX, "token-x");
        firstServer.receive(sessionX, Map.of("type", "create"));
        String roomCode = lastPacket(sessionX).get("roomCode").toString();
        firstServer.authenticate(sessionO, "token-o");
        firstServer.receive(sessionO, Map.of("type", "join", "roomCode", roomCode));
        firstServer.receive(sessionX, Map.of("type", "move", "index", 4));
        assertEquals("X", lastPacket(sessionX).get("cells") instanceof List<?> cells ? cells.get(4) : null);

        TestHandler restartedServer = new TestHandler(auth, users, snapshots);
        restartedServer.restoreRooms();
        WebSocketSession reconnectedX = session();
        restartedServer.authenticate(reconnectedX, "token-x");

        assertTrue(packetOfType(reconnectedX, "ready").get("resumed").equals(true));
        assertEquals("X", ((List<?>) lastPacket(reconnectedX).get("cells")).get(4));
        assertEquals("O", lastPacket(reconnectedX).get("currentMark"));

        WebSocketSession reconnectedO = session();
        restartedServer.authenticate(reconnectedO, "token-o");
        assertTrue(((List<?>) lastPacket(reconnectedO).get("cells")).get(4).equals("X"));
    }

    private WebSocketSession session() throws java.io.IOException {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        when(session.isOpen()).thenReturn(true);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.getId()).thenReturn(java.util.UUID.randomUUID().toString());
        doAnswer(invocation -> {
            TextMessage message = invocation.getArgument(0);
            @SuppressWarnings("unchecked")
            List<String> messages = (List<String>) attributes.computeIfAbsent("sentMessages",
                    ignored -> new ArrayList<String>());
            messages.add(message.getPayload());
            return null;
        }).when(session).sendMessage(any(TextMessage.class));
        return session;
    }

    private Map<String, Object> lastPacket(WebSocketSession session) throws Exception {
        List<Map<String, Object>> packets = packets(session);
        if (packets.isEmpty()) throw new AssertionError("Expected a WebSocket response");
        return packets.get(packets.size() - 1);
    }

    private Map<String, Object> packetOfType(WebSocketSession session, String type) throws Exception {
        return packets(session).stream().filter(packet -> type.equals(packet.get("type"))).findFirst()
                .orElseThrow(() -> new AssertionError("Expected a " + type + " packet"));
    }

    private List<Map<String, Object>> packets(WebSocketSession session) throws Exception {
        @SuppressWarnings("unchecked")
        List<String> messages = (List<String>) session.getAttributes().computeIfAbsent("sentMessages",
                ignored -> new ArrayList<String>());
        List<Map<String, Object>> packets = new ArrayList<>();
        for (String message : messages) {
            packets.add(new ObjectMapper().readValue(message,
                    new com.fasterxml.jackson.core.type.TypeReference<>() {}));
        }
        return packets;
    }

    private static final class TestHandler extends GameWebSocketHandler {
        private TestHandler(AuthService auth, UserAccountRepository users, GameRoomSnapshotRepository snapshots) {
            super(new ObjectMapper(), auth, users, snapshots);
        }

        private void receive(WebSocketSession session, Map<String, ?> packet) throws Exception {
            handleTextMessage(session, new TextMessage(new ObjectMapper().writeValueAsString(packet)));
        }

        private void authenticate(WebSocketSession session, String token) throws Exception {
            afterConnectionEstablished(session);
            receive(session, Map.of("type", "auth", "token", token));
        }
    }
}
