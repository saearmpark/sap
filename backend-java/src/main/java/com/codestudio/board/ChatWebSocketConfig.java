package com.codestudio.board;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class ChatWebSocketConfig implements WebSocketConfigurer {
    private final ChatWebSocketHandler chatHandler;
    private final GameWebSocketHandler gameHandler;

    public ChatWebSocketConfig(ChatWebSocketHandler chatHandler, GameWebSocketHandler gameHandler) {
        this.chatHandler = chatHandler;
        this.gameHandler = gameHandler;
    }

    @Override
    public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler, "/ws/chat")
                .setAllowedOrigins(
                        "https://saearmpark.github.io",
                        "http://localhost:5500",
                        "http://127.0.0.1:5500",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080");
        registry.addHandler(gameHandler, "/ws/game")
                .setAllowedOrigins(
                        "https://saearmpark.github.io",
                        "http://localhost:5500",
                        "http://127.0.0.1:5500",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080");
    }
}
