package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "chat_message")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long senderId;

    private Long recipientId;

    @Column(nullable = false, length = 16)
    private String chatType;

    @Column(nullable = false, length = 30)
    private String senderName;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(nullable = false)
    private Instant createdAt;

    protected ChatMessage() {
    }

    public ChatMessage(Long senderId, Long recipientId, String chatType, String senderName, String content) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.chatType = chatType;
        this.senderName = senderName;
        this.content = content;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getSenderId() { return senderId; }
    public Long getRecipientId() { return recipientId; }
    public String getChatType() { return chatType; }
    public String getSenderName() { return senderName; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
