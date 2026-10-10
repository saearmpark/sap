package com.codestudio.board;

import java.time.Instant;

public record ChatMessageView(
        Long id,
        String type,
        Long senderId,
        Long recipientId,
        String senderName,
        String content,
        Instant createdAt) {
    public ChatMessageView(ChatMessage message) {
        this(message.getId(), message.getChatType(), message.getSenderId(), message.getRecipientId(),
                message.getSenderName(), message.getContent(), message.getCreatedAt());
    }
}
