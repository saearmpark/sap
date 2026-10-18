package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "game_scores", uniqueConstraints = @UniqueConstraint(columnNames = {"game_id", "user_id"}))
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false, length = 40)
    private String gameId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "player_name", nullable = false, length = 30)
    private String playerName;

    @Column(nullable = false)
    private long score;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GameScore() {
    }

    public GameScore(String gameId, Long userId, String playerName, long score) {
        this.gameId = gameId;
        this.userId = userId;
        this.playerName = playerName;
        this.score = score;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getGameId() {
        return gameId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public long getScore() {
        return score;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public void setScore(long score) {
        this.score = score;
    }
}
