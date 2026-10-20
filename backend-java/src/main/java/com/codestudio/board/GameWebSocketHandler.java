package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketHandler.class);
    private static final String ROOM_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ROOM_CODE_LENGTH = 6;
    private static final long RECONNECT_GRACE_MILLIS = 60_000L;
    private static final int[][] WIN_LINES = {
            {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
            {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
            {0, 4, 8}, {2, 4, 6}
    };

    private final ObjectMapper objectMapper;
    private final AuthService authService;
    private final UserAccountRepository users;
    private final GameRoomSnapshotRepository snapshots;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final Set<WebSocketSession> allSessions = ConcurrentHashMap.newKeySet();

    public GameWebSocketHandler(
            ObjectMapper objectMapper,
            AuthService authService,
            UserAccountRepository users,
            GameRoomSnapshotRepository snapshots) {
        this.objectMapper = objectMapper;
        this.authService = authService;
        this.users = users;
        this.snapshots = snapshots;
    }

    @PostConstruct
    public void restoreRooms() {
        long now = System.currentTimeMillis();
        for (GameRoomSnapshot snapshot : snapshots.findAll()) {
            GameRoom room = GameRoom.fromSnapshot(snapshot, now);
            rooms.put(room.code, room);
        }
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        session.getAttributes().put("connectedAt", System.currentTimeMillis());
        allSessions.add(session);
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage textMessage)
            throws IOException {
        JsonNode payload;
        try {
            payload = objectMapper.readTree(textMessage.getPayload());
        } catch (IOException exception) {
            sendError(session, "메시지 형식을 확인할 수 없습니다.");
            return;
        }

        Long userId = (Long) session.getAttributes().get("userId");
        if (userId == null) {
            authenticate(session, payload);
            return;
        }

        switch (payload.path("type").asText()) {
            case "create" -> createRoom(session, userId);
            case "join" -> joinRoom(session, userId, payload.path("roomCode").asText(""));
            case "move" -> makeMove(session, userId, payload.path("index").asInt(-1));
            case "rematch" -> requestRematch(session, userId);
            case "leave" -> leaveRoom(session);
            default -> sendError(session, "지원하지 않는 요청입니다.");
        }
    }

    private void authenticate(WebSocketSession session, JsonNode payload) throws IOException {
        if (!"auth".equals(payload.path("type").asText())) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        String token = payload.path("token").asText("");
        AuthService.UserIdentity identity = authService.identityForToken(token);
        UserAccount user = identity == null ? null : users.findById(identity.userId()).orElse(null);
        if (user == null || !user.isApproved()) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put("userId", user.getId());
        session.getAttributes().put("displayName", user.getDisplayName());
        session.getAttributes().put("token", token);
        session.getAttributes().put("lastTokenCheck", System.currentTimeMillis());
        GameRoom resumedRoom = reconnectPlayer(user.getId(), session);
        sendPacket(session, Map.of("type", "ready", "resumed", resumedRoom != null));
        if (resumedRoom != null) {
            sendRoomState(resumedRoom);
        }
    }

    private void createRoom(WebSocketSession session, Long userId) throws IOException {
        if (session.getAttributes().containsKey("roomCode")) {
            sendError(session, "현재 대전방에서 먼저 나가주세요.");
            return;
        }

        GameRoom room;
        do {
            room = new GameRoom(createRoomCode(), userId,
                    (String) session.getAttributes().get("displayName"), session);
        } while (rooms.putIfAbsent(room.code, room) != null);
        session.getAttributes().put("roomCode", room.code);
        persistRoom(room);
        sendPlayerState(room, session);
    }

    private void joinRoom(WebSocketSession session, Long userId, String rawCode) throws IOException {
        if (session.getAttributes().containsKey("roomCode")) {
            sendError(session, "현재 대전방에서 먼저 나가주세요.");
            return;
        }
        String code = rawCode.trim().toUpperCase();
        if (!code.matches("[A-HJ-NP-Z2-9]{6}")) {
            sendError(session, "방 코드는 영문 대문자와 숫자 6자리입니다.");
            return;
        }

        GameRoom room = rooms.get(code);
        if (room == null) {
            sendError(session, "방을 찾을 수 없습니다. 코드가 맞는지 확인해주세요.");
            return;
        }
        synchronized (room) {
            if (rooms.get(code) != room) {
                sendError(session, "방을 찾을 수 없습니다. 코드가 맞는지 확인해주세요.");
                return;
            }
            if (room.oUserId != null) {
                sendError(session, "이미 상대가 입장한 방입니다.");
                return;
            }
            if (room.xUserId.equals(userId)) {
                sendError(session, "같은 계정으로 만든 방에는 입장할 수 없습니다.");
                return;
            }
            room.oUserId = userId;
            room.oName = (String) session.getAttributes().get("displayName");
            room.oSession = session;
            session.getAttributes().put("roomCode", room.code);
            persistRoom(room);
            sendRoomState(room);
        }
    }

    private void makeMove(WebSocketSession session, Long userId, int index) throws IOException {
        GameRoom room = roomFor(session);
        if (room == null) {
            sendError(session, "먼저 대전방을 만들거나 입장해주세요.");
            return;
        }
        synchronized (room) {
            String mark = room.markFor(userId);
            if (mark == null || room.oSession == null) {
                sendError(session, "상대가 입장할 때까지 기다려주세요.");
                return;
            }
            if (room.finished || !mark.equals(room.currentMark)) {
                sendError(session, "지금은 둘 수 없습니다.");
                return;
            }
            if (index < 0 || index >= room.cells.length || room.cells[index] != null) {
                sendError(session, "둘 수 없는 칸입니다.");
                return;
            }

            room.cells[index] = mark;
            room.winner = findWinner(room.cells);
            if (room.winner == null && allCellsFilled(room.cells)) {
                room.winner = "draw";
            }
            room.finished = room.winner != null;
            if (!room.finished) {
                room.currentMark = "X".equals(mark) ? "O" : "X";
            }
            persistRoom(room);
            sendRoomState(room);
        }
    }

    private void requestRematch(WebSocketSession session, Long userId) throws IOException {
        GameRoom room = roomFor(session);
        if (room == null) {
            sendError(session, "대전방을 찾을 수 없습니다.");
            return;
        }
        synchronized (room) {
            String mark = room.markFor(userId);
            if (mark == null || room.oSession == null || !room.finished) {
                sendError(session, "게임이 끝난 뒤 재대결을 요청할 수 있습니다.");
                return;
            }
            room.rematchRequests.add(mark);
            if (room.rematchRequests.size() == 2) {
                room.reset();
            }
            persistRoom(room);
            sendRoomState(room);
        }
    }

    private void leaveRoom(WebSocketSession session) {
        GameRoom room = roomFor(session);
        if (room == null) {
            sendQuietly(session, Map.of("type", "left"));
            return;
        }
        synchronized (room) {
            rooms.remove(room.code, room);
            snapshots.deleteById(room.code);
            if (room.xSession == session) {
                if (room.oSession != null) {
                    sendQuietly(room.oSession, Map.of("type", "opponent-left"));
                    room.oSession.getAttributes().remove("roomCode");
                }
            } else if (room.oSession == session) {
                sendQuietly(room.xSession, Map.of("type", "opponent-left"));
                room.xSession.getAttributes().remove("roomCode");
            }
            session.getAttributes().remove("roomCode");
            sendQuietly(session, Map.of("type", "left"));
        }
    }

    private void persistRoom(GameRoom room) {
        snapshots.save(room.toSnapshot());
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        allSessions.remove(session);
        disconnectPlayer(session);
    }

    @Scheduled(fixedDelay = 10_000L)
    public void closeUnauthenticatedOrRevokedSessions() {
        long now = System.currentTimeMillis();
        for (WebSocketSession session : allSessions) {
            Object userValue = session.getAttributes().get("userId");
            if (!(userValue instanceof Long)) {
                long connectedAt = (long) session.getAttributes().get("connectedAt");
                if (now - connectedAt > 10_000L) {
                    closeSession(session);
                }
                continue;
            }
            long lastCheck = (long) session.getAttributes().get("lastTokenCheck");
            if (now - lastCheck < 30_000L) {
                continue;
            }
            session.getAttributes().put("lastTokenCheck", now);
            String token = (String) session.getAttributes().get("token");
            if (authService.identityForToken(token) == null) {
                closeSession(session);
            }
        }
        expireDisconnectedRooms(now);
    }

    private void closeSession(WebSocketSession session) {
        try {
            if (session.isOpen()) {
                session.close(CloseStatus.POLICY_VIOLATION);
            }
        } catch (IOException exception) {
            logger.debug("Could not close game session {}", session.getId(), exception);
        }
    }

    private GameRoom roomFor(WebSocketSession session) {
        Object code = session.getAttributes().get("roomCode");
        return code instanceof String roomCode ? rooms.get(roomCode) : null;
    }

    private GameRoom reconnectPlayer(Long userId, WebSocketSession session) {
        for (GameRoom room : rooms.values()) {
            synchronized (room) {
                if (rooms.get(room.code) != room) {
                    continue;
                }
                String mark = room.markFor(userId);
                if (mark == null) {
                    continue;
                }
                WebSocketSession previous = room.sessionFor(mark);
                if (previous != null && previous.isOpen()) {
                    previous.getAttributes().remove("roomCode");
                    room.setSession(mark, session);
                    room.setDisconnectedAt(mark, 0L);
                    session.getAttributes().put("roomCode", room.code);
                    closeSession(previous);
                    WebSocketSession opponent = room.sessionFor(oppositeMark(mark));
                    if (opponent != null) {
                        sendQuietly(opponent, Map.of("type", "opponent-reconnected"));
                    }
                    return room;
                }
                long disconnectedAt = room.disconnectedAtFor(mark);
                if (disconnectedAt == 0L || System.currentTimeMillis() - disconnectedAt > RECONNECT_GRACE_MILLIS) {
                    if (rooms.remove(room.code, room)) {
                        WebSocketSession opponent = room.sessionFor(oppositeMark(mark));
                        if (opponent != null) {
                            opponent.getAttributes().remove("roomCode");
                            sendQuietly(opponent, Map.of("type", "opponent-left"));
                        }
                    }
                    continue;
                }
                room.setSession(mark, session);
                room.setDisconnectedAt(mark, 0L);
                session.getAttributes().put("roomCode", room.code);
                WebSocketSession opponent = room.sessionFor(oppositeMark(mark));
                if (opponent != null) {
                    sendQuietly(opponent, Map.of("type", "opponent-reconnected"));
                }
                return room;
            }
        }
        return null;
    }

    private void disconnectPlayer(WebSocketSession session) {
        GameRoom room = roomFor(session);
        if (room == null) {
            return;
        }
        synchronized (room) {
            Long userId = (Long) session.getAttributes().get("userId");
            String mark = userId == null ? null : room.markFor(userId);
            if (mark == null || room.sessionFor(mark) != session) {
                return;
            }
            room.setSession(mark, null);
            room.setDisconnectedAt(mark, System.currentTimeMillis());
            session.getAttributes().remove("roomCode");
            persistRoom(room);
            WebSocketSession opponent = room.sessionFor(oppositeMark(mark));
            if (opponent != null) {
                sendQuietly(opponent, Map.of(
                        "type", "opponent-disconnected",
                        "reconnectSeconds", RECONNECT_GRACE_MILLIS / 1000L));
                sendPlayerState(room, opponent);
            }
        }
    }

    private void expireDisconnectedRooms(long now) {
        for (GameRoom room : rooms.values()) {
            synchronized (room) {
                boolean xExpired = room.xSession == null
                        && room.xDisconnectedAt != 0L
                        && now - room.xDisconnectedAt > RECONNECT_GRACE_MILLIS;
                boolean oExpired = room.oSession == null
                        && room.oDisconnectedAt != 0L
                        && now - room.oDisconnectedAt > RECONNECT_GRACE_MILLIS;
                if (!xExpired && !oExpired) {
                    continue;
                }
                if (rooms.remove(room.code, room)) {
                    snapshots.deleteById(room.code);
                    WebSocketSession opponent = xExpired ? room.oSession : room.xSession;
                    if (opponent != null) {
                        opponent.getAttributes().remove("roomCode");
                        sendQuietly(opponent, Map.of("type", "opponent-left"));
                    }
                }
            }
        }
    }

    private String oppositeMark(String mark) {
        return "X".equals(mark) ? "O" : "X";
    }

    private String createRoomCode() {
        StringBuilder code = new StringBuilder(ROOM_CODE_LENGTH);
        for (int i = 0; i < ROOM_CODE_LENGTH; i++) {
            code.append(ROOM_CODE_CHARACTERS.charAt(secureRandom.nextInt(ROOM_CODE_CHARACTERS.length())));
        }
        return code.toString();
    }

    private String findWinner(String[] cells) {
        for (int[] line : WIN_LINES) {
            String mark = cells[line[0]];
            if (mark != null && mark.equals(cells[line[1]]) && mark.equals(cells[line[2]])) {
                return mark;
            }
        }
        return null;
    }

    private boolean allCellsFilled(String[] cells) {
        for (String cell : cells) {
            if (cell == null) {
                return false;
            }
        }
        return true;
    }

    private void sendRoomState(GameRoom room) {
        if (room.xSession != null) {
            sendPlayerState(room, room.xSession);
        }
        if (room.oSession != null) {
            sendPlayerState(room, room.oSession);
        }
    }

    private void sendPlayerState(GameRoom room, WebSocketSession session) {
        Long userId = (Long) session.getAttributes().get("userId");
        Map<String, Object> packet = new LinkedHashMap<>();
        packet.put("type", "state");
        packet.put("roomCode", room.code);
        packet.put("status", room.oSession == null ? "waiting" : room.finished ? "finished" : "playing");
        packet.put("cells", room.cells.clone());
        packet.put("currentMark", room.currentMark);
        packet.put("winner", room.winner);
        packet.put("yourMark", room.markFor(userId));
        packet.put("xName", room.xName);
        packet.put("oName", room.oName);
        packet.put("xConnected", room.xSession != null);
        packet.put("oConnected", room.oSession != null);
        packet.put("youRequestedRematch", room.rematchRequests.contains(room.markFor(userId)));
        packet.put("opponentRequestedRematch", room.rematchRequests.contains(
                "X".equals(room.markFor(userId)) ? "O" : "X"));
        sendQuietly(session, packet);
    }

    private void sendError(WebSocketSession session, String message) throws IOException {
        sendPacket(session, Map.of("type", "error", "message", message));
    }

    private void sendPacket(WebSocketSession session, Map<String, ?> packet) throws IOException {
        if (session.isOpen()) {
            synchronized (session) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(packet)));
            }
        }
    }

    private void sendQuietly(WebSocketSession session, Map<String, ?> packet) {
        try {
            sendPacket(session, packet);
        } catch (IOException exception) {
            logger.debug("Could not send game event to session {}", session.getId(), exception);
        }
    }

    private static final class GameRoom {
        private final String code;
        private final Long xUserId;
        private final String xName;
        private WebSocketSession xSession;
        private final Set<String> rematchRequests = new HashSet<>();
        private Long oUserId;
        private String oName;
        private WebSocketSession oSession;
        private long xDisconnectedAt;
        private long oDisconnectedAt;
        private String[] cells = new String[9];
        private String currentMark = "X";
        private String winner;
        private boolean finished;

        private GameRoom(String code, Long xUserId, String xName, WebSocketSession xSession) {
            this.code = code;
            this.xUserId = xUserId;
            this.xName = xName;
            this.xSession = xSession;
        }

        private String markFor(Long userId) {
            if (xUserId.equals(userId)) {
                return "X";
            }
            if (oUserId != null && oUserId.equals(userId)) {
                return "O";
            }
            return null;
        }

        private WebSocketSession sessionFor(String mark) {
            return "X".equals(mark) ? xSession : oSession;
        }

        private void setSession(String mark, WebSocketSession session) {
            if ("X".equals(mark)) {
                xSession = session;
            } else {
                oSession = session;
            }
        }

        private long disconnectedAtFor(String mark) {
            return "X".equals(mark) ? xDisconnectedAt : oDisconnectedAt;
        }

        private void setDisconnectedAt(String mark, long disconnectedAt) {
            if ("X".equals(mark)) {
                xDisconnectedAt = disconnectedAt;
            } else {
                oDisconnectedAt = disconnectedAt;
            }
        }

        private void reset() {
            cells = new String[9];
            currentMark = "X";
            winner = null;
            finished = false;
            rematchRequests.clear();
        }

        private GameRoomSnapshot toSnapshot() {
            StringBuilder savedCells = new StringBuilder(cells.length);
            for (String cell : cells) {
                savedCells.append(cell == null ? '-' : cell);
            }
            return new GameRoomSnapshot(code, xUserId, xName, oUserId, oName, savedCells.toString(),
                    currentMark, winner, finished, rematchRequests.contains("X"), rematchRequests.contains("O"));
        }

        private static GameRoom fromSnapshot(GameRoomSnapshot snapshot, long disconnectedAt) {
            GameRoom room = new GameRoom(snapshot.getCode(), snapshot.getXUserId(), snapshot.getXName(), null);
            room.oUserId = snapshot.getOUserId();
            room.oName = snapshot.getOName();
            String savedCells = snapshot.getCells();
            if (savedCells == null || savedCells.length() != room.cells.length) {
                throw new IllegalStateException("Invalid saved game board for room " + snapshot.getCode());
            }
            for (int i = 0; i < savedCells.length(); i++) {
                char cell = savedCells.charAt(i);
                room.cells[i] = cell == '-' ? null : String.valueOf(cell);
                if (room.cells[i] != null && !"X".equals(room.cells[i]) && !"O".equals(room.cells[i])) {
                    throw new IllegalStateException("Invalid saved game mark for room " + snapshot.getCode());
                }
            }
            room.currentMark = snapshot.getCurrentMark();
            room.winner = snapshot.getWinner();
            room.finished = snapshot.isFinished();
            if (snapshot.isXRequestedRematch()) room.rematchRequests.add("X");
            if (snapshot.isORequestedRematch()) room.rematchRequests.add("O");
            room.xDisconnectedAt = disconnectedAt;
            if (room.oUserId != null) room.oDisconnectedAt = disconnectedAt;
            return room;
        }
    }
}
