package com.codestudio.board;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatMessageRepository messages;
    private final UserAccountRepository users;
    private final ChatWebSocketHandler chatHandler;

    public ChatController(ChatMessageRepository messages, UserAccountRepository users, ChatWebSocketHandler chatHandler) {
        this.messages = messages;
        this.users = users;
        this.chatHandler = chatHandler;
    }

    @GetMapping("/users")
    public List<ChatUserView> getUsers() {
        return chatHandler.getUsers();
    }

    @GetMapping("/messages")
    @Transactional
    public List<ChatMessageView> getMessages(
            @RequestParam(required = false) Long with,
            Authentication authentication) {
        Instant cutoff = Instant.now().minus(2, ChronoUnit.DAYS);
        messages.deleteExpired(cutoff);
        Long userId = (Long) authentication.getPrincipal();
        if (with == null) {
            List<ChatMessageView> roomHistory = messages
                    .findTop100ByChatTypeAndCreatedAtAfterOrderByCreatedAtDesc("ROOM", cutoff).stream()
                    .map(ChatMessageView::new)
                    .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
            Collections.reverse(roomHistory);
            return roomHistory;
        }
        if (with.equals(userId) || users.findById(with).filter(UserAccount::isApproved).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "대화 상대를 찾을 수 없습니다.");
        }
        return messages.findDirectConversation(userId, with, cutoff).stream()
                .map(ChatMessageView::new)
                .toList();
    }
}
