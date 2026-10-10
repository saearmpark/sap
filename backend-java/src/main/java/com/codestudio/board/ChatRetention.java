package com.codestudio.board;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class ChatRetention {
    private final ChatMessageRepository messages;

    public ChatRetention(ChatMessageRepository messages) {
        this.messages = messages;
    }

    @Scheduled(fixedDelay = 60 * 60 * 1000L)
    @Transactional
    public void deleteExpiredMessages() {
        messages.deleteExpired(Instant.now().minus(2, ChronoUnit.DAYS));
    }
}
