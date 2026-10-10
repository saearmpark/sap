package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    private static final int MAX_MESSAGE_LENGTH = 1000;

    private final ObjectMapper objectMapper;
    private final AuthService authService;
    private final UserAccountRepository users;
    private final ChatMessageRepository messages;
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();
    private final Set<WebSocketSession> allSessions = ConcurrentHashMap.newKeySet();

    public ChatWebSocketHandler(
            ObjectMapper objectMapper,
            AuthService authService,
            UserAccountRepository users,
            ChatMessageRepository messages) {
        this.objectMapper = objectMapper;
        this.authService = authService;
        this.users = users;
        this.messages = messages;
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
        if ("message".equals(payload.path("type").asText())) {
            handleChatMessage(session, userId, payload);
        } else {
            sendError(session, "지원하지 않는 요청입니다.");
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
        sessionsByUser.computeIfAbsent(user.getId(), ignored -> ConcurrentHashMap.newKeySet()).add(session);
        synchronized (session) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of("type", "ready"))));
        }
        broadcastPresence();
    }

    private void handleChatMessage(WebSocketSession session, Long senderId, JsonNode payload) throws IOException {
        String content = payload.path("content").asText("").trim();
        if (content.isEmpty() || content.length() > MAX_MESSAGE_LENGTH) {
            sendError(session, "메시지는 1~1000자로 입력하세요.");
            return;
        }
        String chatType = payload.path("chatType").asText("");
        Long recipientId = null;
        if ("DIRECT".equals(chatType)) {
            if (!payload.hasNonNull("recipientId") || !payload.path("recipientId").canConvertToLong()) {
                sendError(session, "대화할 사용자를 선택하세요.");
                return;
            }
            recipientId = payload.path("recipientId").longValue();
            if (recipientId.equals(senderId) || users.findById(recipientId).filter(UserAccount::isApproved).isEmpty()) {
                sendError(session, "대화 상대를 찾을 수 없습니다.");
                return;
            }
        } else if (!"ROOM".equals(chatType)) {
            sendError(session, "지원하지 않는 대화 방식입니다.");
            return;
        }

        String senderName = (String) session.getAttributes().get("displayName");
        ChatMessage saved = messages.save(new ChatMessage(senderId, recipientId, chatType, senderName, content));
        ChatMessageView view = new ChatMessageView(saved);
        String encoded = objectMapper.writeValueAsString(Map.of("type", "message", "message", view));
        if ("ROOM".equals(chatType)) {
            broadcast(encoded);
        } else {
            sendToUser(senderId, encoded);
            sendToUser(recipientId, encoded);
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        allSessions.remove(session);
        Object value = session.getAttributes().get("userId");
        if (!(value instanceof Long userId)) {
            return;
        }
        Set<WebSocketSession> userSessions = sessionsByUser.get(userId);
        if (userSessions != null) {
            userSessions.remove(session);
            if (userSessions.isEmpty()) {
                sessionsByUser.remove(userId, userSessions);
                broadcastPresence();
            }
        }
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
    }

    private void closeSession(WebSocketSession session) {
        try {
            if (session.isOpen()) {
                session.close(CloseStatus.POLICY_VIOLATION);
            }
        } catch (IOException exception) {
            logger.debug("Could not close chat session {}", session.getId(), exception);
        }
    }

    public boolean isOnline(Long userId) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public List<ChatUserView> getUsers() {
        return users.findAllByApprovalStatusOrderByIdAsc("APPROVED").stream()
                .map(user -> new ChatUserView(user.getId(), user.getDisplayName(), isOnline(user.getId())))
                .toList();
    }

    private void broadcastPresence() {
        try {
            broadcast(objectMapper.writeValueAsString(Map.of("type", "presence", "users", getUsers())));
        } catch (IOException exception) {
            logger.error("Failed to encode chat presence update", exception);
        }
    }

    private void broadcast(String payload) {
        for (Set<WebSocketSession> sessions : sessionsByUser.values()) {
            for (WebSocketSession session : sessions) {
                send(session, payload);
            }
        }
    }

    private void sendToUser(Long userId, String payload) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null) {
            return;
        }
        for (WebSocketSession session : sessions) {
            send(session, payload);
        }
    }

    private void send(WebSocketSession session, String payload) {
        if (!session.isOpen()) {
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(payload));
            }
        } catch (IOException exception) {
            logger.debug("Could not send chat event to session {}", session.getId(), exception);
        }
    }

    private void sendError(WebSocketSession session, String message) throws IOException {
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                        Map.of("type", "error", "message", message))));
            }
        }
    }
}
