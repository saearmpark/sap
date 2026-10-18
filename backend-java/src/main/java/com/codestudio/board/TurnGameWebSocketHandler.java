package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TurnGameWebSocketHandler extends TextWebSocketHandler {

    private static final String ROOM_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ROOM_CODE_LENGTH = 6;
    private static final long RECONNECT_GRACE_MILLIS = 60_000L;
    private static final long UNAUTHENTICATED_TIMEOUT_MILLIS = 10_000L;

    private final ObjectMapper mapper;
    private final AuthService authService;
    private final UserAccountRepository users;
    private final TurnGameSnapshotRepository snapshots;
    private final Map<String, TurnGameRules> rulesByType = new HashMap<>();
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Set<WebSocketSession> allSessions = ConcurrentHashMap.newKeySet();
    private final SecureRandom random = new SecureRandom();

    public TurnGameWebSocketHandler(ObjectMapper mapper, AuthService authService, UserAccountRepository users,
            TurnGameSnapshotRepository snapshots, List<TurnGameRules> rules) {
        this.mapper = mapper;
        this.authService = authService;
        this.users = users;
        this.snapshots = snapshots;
        for (TurnGameRules rule : rules) {
            rulesByType.put(rule.gameType(), rule);
        }
    }

    @PostConstruct
    void restoreRooms() {
        for (TurnGameSnapshot snapshot : snapshots.findAll()) {
            if (!rulesByType.containsKey(snapshot.getGameType())) {
                snapshots.delete(snapshot);
                continue;
            }
            Room room = Room.fromSnapshot(snapshot);
            room.p1DisconnectedAt = now();
            room.p2DisconnectedAt = snapshot.getP2UserId() == null ? 0 : now();
            rooms.put(room.code, room);
        }
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        allSessions.add(session);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
        JsonNode packet;
        try {
            packet = mapper.readTree(message.getPayload());
        } catch (Exception error) {
            sendPacket(session, Map.of("type", "error", "message", "메시지를 해석할 수 없습니다."));
            return;
        }

        if (!session.getAttributes().containsKey("userId")) {
            authenticate(session, packet);
            return;
        }

        switch (packet.path("type").asText("")) {
            case "create" -> createRoom(session, packet);
            case "join" -> joinRoom(session, packet);
            case "move" -> makeMove(session, packet);
            case "rematch" -> requestRematch(session);
            case "leave" -> leaveRoom(session);
            default -> sendPacket(session, Map.of("type", "error", "message", "알 수 없는 요청입니다."));
        }
    }

    private void authenticate(WebSocketSession session, JsonNode packet) throws Exception {
        String type = packet.path("type").asText("");
        String token = packet.path("token").asText("");
        if (!"auth".equals(type) || token.isEmpty()) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        AuthService.UserIdentity identity = authService.identityForToken(token);
        if (identity == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        String displayName = users.findById(identity.userId())
                .map(UserAccount::getDisplayName)
                .orElse("플레이어");
        session.getAttributes().put("userId", identity.userId());
        session.getAttributes().put("displayName", displayName);
        session.getAttributes().put("token", token);
        session.getAttributes().put("lastTokenCheck", now());

        Room resumed = reconnectPlayer(identity.userId(), session);
        sendPacket(session, Map.of("type", "ready", "resumed", resumed != null));
        if (resumed != null) {
            sendPlayerState(resumed);
        }
    }

    private void createRoom(WebSocketSession session, JsonNode packet) throws Exception {
        String gameType = packet.path("gameType").asText("");
        TurnGameRules rule = rulesByType.get(gameType);
        if (rule == null) {
            sendPacket(session, Map.of("type", "error", "message", "지원하지 않는 게임입니다."));
            return;
        }
        long userId = (Long) session.getAttributes().get("userId");
        String displayName = (String) session.getAttributes().get("displayName");
        leaveExisting(userId, session);

        String code = createRoomCode();
        Room room = new Room(code, gameType, userId, displayName, rule.initialJson());
        room.p1Session = session;
        rooms.put(code, room);
        persistRoom(room);
        sendPlayerState(room);
    }

    private void joinRoom(WebSocketSession session, JsonNode packet) throws Exception {
        String code = packet.path("roomCode").asText("").trim().toUpperCase();
        long userId = (Long) session.getAttributes().get("userId");
        Room room = rooms.get(code);
        if (room == null) {
            sendPacket(session, Map.of("type", "error", "message", "해당 코드의 대전방을 찾을 수 없습니다."));
            return;
        }

        synchronized (room) {
            if (room.p2Session != null) {
                sendPacket(session, Map.of("type", "error", "message", "이미 두 명이 입장한 방입니다."));
                return;
            }
            if (room.p1UserId == userId) {
                sendPacket(session, Map.of("type", "error", "message", "같은 방에 다시 입장할 수 없습니다."));
                return;
            }
            leaveExisting(userId, session);
            room.p2UserId = userId;
            room.p2Name = (String) session.getAttributes().get("displayName");
            room.p2Session = session;
            room.p2DisconnectedAt = 0;
            persistRoom(room);
        }
        sendPlayerState(room);
    }

    private void makeMove(WebSocketSession session, JsonNode packet) throws Exception {
        long userId = (Long) session.getAttributes().get("userId");
        Room room = findRoomForUser(userId);
        if (room == null) {
            sendPacket(session, Map.of("type", "error", "message", "참가 중인 대전방이 없습니다."));
            return;
        }

        synchronized (room) {
            int seat = room.seatFor(userId);
            if (seat == 0 || room.p2Session == null) {
                sendPacket(session, Map.of("type", "error", "message", "상대를 기다리는 중입니다."));
                return;
            }
            if (room.finished) {
                sendPacket(session, Map.of("type", "error", "message", "이미 끝난 게임입니다."));
                return;
            }
            if (room.currentPlayer != seat) {
                sendPacket(session, Map.of("type", "error", "message", "상대 차례입니다."));
                return;
            }
            TurnGameRules rule = rulesByType.get(room.gameType);
            TurnGameRules.Outcome outcome = rule.apply(room.state, seat, packet);
            if (outcome == null) {
                sendPacket(session, Map.of("type", "error", "message", "둘 수 없는 수입니다."));
                return;
            }
            room.state = outcome.stateJson();
            room.winner = outcome.winner();
            room.finished = room.winner != -1;
            if (!room.finished) {
                room.currentPlayer = seat == 1 ? 2 : 1;
            }
            room.rematchRequests.clear();
            persistRoom(room);
        }
        sendPlayerState(room);
    }

    private void requestRematch(WebSocketSession session) throws Exception {
        long userId = (Long) session.getAttributes().get("userId");
        Room room = findRoomForUser(userId);
        if (room == null) {
            sendPacket(session, Map.of("type", "error", "message", "참가 중인 대전방이 없습니다."));
            return;
        }
        synchronized (room) {
            if (!room.finished) {
                sendPacket(session, Map.of("type", "error", "message", "게임이 끝난 뒤 재대결할 수 있습니다."));
                return;
            }
            room.rematchRequests.add(room.seatFor(userId));
            if (room.rematchRequests.contains(1) && room.rematchRequests.contains(2)) {
                room.state = rulesByType.get(room.gameType).initialJson();
                room.currentPlayer = 1;
                room.winner = -1;
                room.finished = false;
                room.rematchRequests.clear();
            }
            persistRoom(room);
        }
        sendPlayerState(room);
    }

    private void leaveRoom(WebSocketSession session) throws Exception {
        long userId = (Long) session.getAttributes().get("userId");
        Room room = findRoomForUser(userId);
        if (room == null) {
            sendPacket(session, Map.of("type", "left"));
            return;
        }
        rooms.remove(room.code);
        snapshots.deleteById(room.code);
        WebSocketSession opponent = opponentSession(room, room.seatFor(userId));
        if (opponent != null) {
            sendPacket(opponent, Map.of("type", "opponent-left"));
        }
        sendPacket(session, Map.of("type", "left"));
    }

    private void leaveExisting(long userId, WebSocketSession session) {
        Room existing = findRoomForUser(userId);
        if (existing == null) {
            return;
        }
        int seat = existing.seatFor(userId);
        existing.setSession(seat, null);
        rooms.remove(existing.code);
        snapshots.deleteById(existing.code);
        WebSocketSession opponent = opponentSession(existing, seat);
        if (opponent != null && opponent != session) {
            sendQuietly(opponent, Map.of("type", "opponent-left"));
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        allSessions.remove(session);
        Object userId = session.getAttributes().get("userId");
        if (!(userId instanceof Long id)) {
            return;
        }
        Room room = findRoomForUser(id);
        if (room == null) {
            return;
        }
        synchronized (room) {
            int seat = room.seatFor(id);
            if (room.sessionFor(seat) != session) {
                return;
            }
            room.setSession(seat, null);
            if (seat == 1) {
                room.p1DisconnectedAt = now();
            } else {
                room.p2DisconnectedAt = now();
            }
            persistRoom(room);
        }
        WebSocketSession opponent = opponentSession(room, room.seatFor(id));
        if (opponent != null) {
            sendQuietly(opponent, Map.of("type", "opponent-disconnected", "reconnectSeconds", 60));
        }
    }

    private Room reconnectPlayer(long userId, WebSocketSession session) {
        Room room = findRoomForUser(userId);
        if (room == null) {
            return null;
        }
        int seat = room.seatFor(userId);
        synchronized (room) {
            long disconnectedAt = seat == 1 ? room.p1DisconnectedAt : room.p2DisconnectedAt;
            if (disconnectedAt != 0 && now() - disconnectedAt > RECONNECT_GRACE_MILLIS) {
                rooms.remove(room.code);
                snapshots.deleteById(room.code);
                WebSocketSession opponent = opponentSession(room, seat);
                if (opponent != null) {
                    sendQuietly(opponent, Map.of("type", "opponent-left"));
                }
                return null;
            }
            WebSocketSession previous = room.sessionFor(seat);
            room.setSession(seat, session);
            if (seat == 1) {
                room.p1DisconnectedAt = 0;
            } else {
                room.p2DisconnectedAt = 0;
            }
            if (previous != null && previous != session) {
                sendQuietly(previous, Map.of("type", "error", "message", "다른 창에서 접속하여 이 연결을 종료합니다."));
                try {
                    previous.close();
                } catch (IOException ignored) {
                }
            }
            persistRoom(room);
        }
        WebSocketSession opponent = opponentSession(room, seat);
        if (opponent != null) {
            sendQuietly(opponent, Map.of("type", "opponent-reconnected"));
        }
        return room;
    }

    @Scheduled(fixedDelay = 10_000L)
    void reapSessionsAndRooms() {
        long now = now();
        for (WebSocketSession session : allSessions) {
            if (!session.getAttributes().containsKey("userId")) {
                Object since = session.getAttributes().get("openedAt");
                if (!(since instanceof Long openedAt)) {
                    session.getAttributes().put("openedAt", now);
                } else if (now - openedAt > UNAUTHENTICATED_TIMEOUT_MILLIS) {
                    try {
                        session.close(CloseStatus.POLICY_VIOLATION);
                    } catch (IOException ignored) {
                    }
                }
            }
        }
        for (Room room : rooms.values()) {
            synchronized (room) {
                boolean p1Expired = room.p1Session == null && room.p1DisconnectedAt != 0
                        && now - room.p1DisconnectedAt > RECONNECT_GRACE_MILLIS;
                boolean p2Expired = room.p2Session == null && room.p2DisconnectedAt != 0
                        && now - room.p2DisconnectedAt > RECONNECT_GRACE_MILLIS;
                if (p1Expired || p2Expired) {
                    rooms.remove(room.code);
                    snapshots.deleteById(room.code);
                    WebSocketSession opponent = opponentSession(room, p1Expired ? 1 : 2);
                    if (opponent != null) {
                        sendQuietly(opponent, Map.of("type", "opponent-left"));
                    }
                }
            }
        }
    }

    private Room findRoomForUser(long userId) {
        for (Room room : rooms.values()) {
            if (room.seatFor(userId) != 0) {
                return room;
            }
        }
        return null;
    }

    private WebSocketSession opponentSession(Room room, int seat) {
        return seat == 1 ? room.p2Session : room.p1Session;
    }

    private String createRoomCode() {
        while (true) {
            StringBuilder builder = new StringBuilder(ROOM_CODE_LENGTH);
            for (int i = 0; i < ROOM_CODE_LENGTH; i++) {
                builder.append(ROOM_CODE_CHARACTERS.charAt(random.nextInt(ROOM_CODE_CHARACTERS.length())));
            }
            String code = builder.toString();
            if (!rooms.containsKey(code)) {
                return code;
            }
        }
    }

    private void persistRoom(Room room) {
        snapshots.save(room.toSnapshot());
    }

    private void sendPlayerState(Room room) throws Exception {
        for (int seat = 1; seat <= 2; seat++) {
            WebSocketSession session = room.sessionFor(seat);
            if (session == null) {
                continue;
            }
            sendPacket(session, buildPlayerState(room, seat));
        }
    }

    private Map<String, Object> buildPlayerState(Room room, int seat) throws Exception {
        Map<String, Object> packet = new LinkedHashMap<>();
        packet.put("type", "state");
        packet.put("roomCode", room.code);
        packet.put("gameType", room.gameType);
        packet.put("status", room.p2Session == null ? "waiting" : room.finished ? "finished" : "playing");
        packet.put("state", mapper.readTree(room.state));
        packet.put("currentPlayer", room.currentPlayer);
        packet.put("winner", room.winner);
        packet.put("yourSeat", seat);
        packet.put("p1Name", room.p1Name);
        packet.put("p2Name", room.p2Name);
        packet.put("p1Connected", room.p1Session != null);
        packet.put("p2Connected", room.p2Session != null);
        packet.put("youRequestedRematch", room.rematchRequests.contains(seat));
        packet.put("opponentRequestedRematch", room.rematchRequests.contains(seat == 1 ? 2 : 1));
        return packet;
    }

    private void sendPacket(WebSocketSession session, Map<String, ?> packet) throws IOException {
        String payload = mapper.writeValueAsString(packet);
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void sendQuietly(WebSocketSession session, Map<String, ?> packet) {
        try {
            sendPacket(session, packet);
        } catch (IOException ignored) {
        }
    }

    private static long now() {
        return System.currentTimeMillis();
    }

    private static final class Room {
        final String code;
        final String gameType;
        final long p1UserId;
        final String p1Name;
        Long p2UserId;
        String p2Name;
        WebSocketSession p1Session;
        WebSocketSession p2Session;
        long p1DisconnectedAt;
        long p2DisconnectedAt;
        String state;
        int currentPlayer = 1;
        int winner = -1;
        boolean finished;
        final Set<Integer> rematchRequests = ConcurrentHashMap.newKeySet();

        Room(String code, String gameType, long p1UserId, String p1Name, String state) {
            this.code = code;
            this.gameType = gameType;
            this.p1UserId = p1UserId;
            this.p1Name = p1Name;
            this.state = state;
        }

        int seatFor(long userId) {
            if (p1UserId == userId) {
                return 1;
            }
            if (p2UserId != null && p2UserId == userId) {
                return 2;
            }
            return 0;
        }

        WebSocketSession sessionFor(int seat) {
            return seat == 1 ? p1Session : p2Session;
        }

        void setSession(int seat, WebSocketSession session) {
            if (seat == 1) {
                p1Session = session;
            } else if (seat == 2) {
                p2Session = session;
            }
        }

        TurnGameSnapshot toSnapshot() {
            return new TurnGameSnapshot(code, gameType, p1UserId, p1Name, p2UserId, p2Name, state,
                    currentPlayer, winner, finished,
                    rematchRequests.contains(1), rematchRequests.contains(2));
        }

        static Room fromSnapshot(TurnGameSnapshot snapshot) {
            Room room = new Room(snapshot.getCode(), snapshot.getGameType(), snapshot.getP1UserId(),
                    snapshot.getP1Name(), snapshot.getStateJson());
            room.p2UserId = snapshot.getP2UserId();
            room.p2Name = snapshot.getP2Name();
            room.currentPlayer = snapshot.getCurrentPlayer();
            room.winner = snapshot.getWinner();
            room.finished = snapshot.isFinished();
            if (snapshot.isP1RequestedRematch()) {
                room.rematchRequests.add(1);
            }
            if (snapshot.isP2RequestedRematch()) {
                room.rematchRequests.add(2);
            }
            return room;
        }
    }
}
