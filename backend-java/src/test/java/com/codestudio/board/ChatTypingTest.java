package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class ChatTypingTest {
    @Test
    void forwardsTypingToDirectRecipientWithoutSaving() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        AuthService auth = mock(AuthService.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        when(messages.save(any(ChatMessage.class))).thenThrow(new AssertionError("typing must not be saved"));

        UserAccount sender = mock(UserAccount.class);
        when(sender.getId()).thenReturn(1L);
        when(sender.getDisplayName()).thenReturn("Tester");
        when(sender.isApproved()).thenReturn(true);
        when(auth.identityForToken("token-1")).thenReturn(new AuthService.UserIdentity(1L, false));
        when(users.findById(1L)).thenReturn(Optional.of(sender));

        UserAccount recipient = mock(UserAccount.class);
        when(recipient.getId()).thenReturn(2L);
        when(recipient.getDisplayName()).thenReturn("Friend");
        when(recipient.isApproved()).thenReturn(true);
        when(auth.identityForToken("token-2")).thenReturn(new AuthService.UserIdentity(2L, false));
        when(users.findById(2L)).thenReturn(Optional.of(recipient));

        ChatWebSocketHandler handler = new ChatWebSocketHandler(mapper, auth, users, messages);
        List<String> senderInbox = new ArrayList<>();
        List<String> recipientInbox = new ArrayList<>();
        WebSocketSession senderSession = session(senderInbox);
        WebSocketSession recipientSession = session(recipientInbox);

        handler.afterConnectionEstablished(senderSession);
        handler.afterConnectionEstablished(recipientSession);
        handler.handleTextMessage(senderSession, new TextMessage("{\"type\":\"auth\",\"token\":\"token-1\"}"));
        handler.handleTextMessage(recipientSession, new TextMessage("{\"type\":\"auth\",\"token\":\"token-2\"}"));

        handler.handleTextMessage(senderSession,
                new TextMessage("{\"type\":\"typing\",\"chatType\":\"DIRECT\",\"recipientId\":2}"));

        assertTrue(recipientInbox.stream().anyMatch(payload -> payload.contains("\"type\":\"typing\"")));
        assertTrue(recipientInbox.stream().anyMatch(payload -> payload.contains("Tester")));
        assertFalse(senderInbox.stream().anyMatch(payload -> payload.contains("\"type\":\"typing\"")));
        verify(messages, never()).save(any(ChatMessage.class));
    }

    private static WebSocketSession session(List<String> inbox) throws Exception {
        Map<String, Object> attributes = new HashMap<>();
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(true);
        when(session.getId()).thenReturn(UUID.randomUUID().toString());
        doAnswer(invocation -> {
            TextMessage message = invocation.getArgument(0);
            inbox.add(message.getPayload());
            return null;
        }).when(session).sendMessage(any(TextMessage.class));
        return session;
    }
}
