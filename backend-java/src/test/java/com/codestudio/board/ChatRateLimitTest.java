package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class ChatRateLimitTest {
    @Test
    void rejectsMessagesOverTheBurstLimit() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        AuthService auth = mock(AuthService.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        ChatMessage saved = mock(ChatMessage.class);

        UserAccount user = mock(UserAccount.class);
        when(user.getId()).thenReturn(1L);
        when(user.getDisplayName()).thenReturn("Tester");
        when(user.isApproved()).thenReturn(true);
        when(auth.identityForToken("token")).thenReturn(new AuthService.UserIdentity(1L, false));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(messages.save(any(ChatMessage.class))).thenReturn(saved);

        ChatWebSocketHandler handler = new ChatWebSocketHandler(mapper, auth, users, messages);
        Map<String, Object> attributes = new HashMap<>();
        List<String> sent = new ArrayList<>();
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        doAnswer(invocation -> {
            TextMessage message = invocation.getArgument(0);
            sent.add(message.getPayload());
            return null;
        }).when(session).sendMessage(any(TextMessage.class));

        handler.afterConnectionEstablished(session);
        handler.handleTextMessage(session, new TextMessage("{\"type\":\"auth\",\"token\":\"token\"}"));

        for (int index = 0; index < 5; index++) {
            handler.handleTextMessage(session, new TextMessage("{\"type\":\"message\",\"chatType\":\"ROOM\",\"content\":\"hello\"}"));
        }
        verify(messages, times(5)).save(any(ChatMessage.class));

        handler.handleTextMessage(session, new TextMessage("{\"type\":\"message\",\"chatType\":\"ROOM\",\"content\":\"too fast\"}"));
        verify(messages, times(5)).save(any(ChatMessage.class));
        assertTrue(sent.stream().anyMatch(payload -> payload.contains("빠르게")));
    }
}
