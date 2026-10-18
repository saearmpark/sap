package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "turn_game_snapshot")
public class TurnGameSnapshot {

    @Id
    @Column(length = 6)
    private String code;

    @Column(name = "game_type", nullable = false, length = 20)
    private String gameType;

    @Column(name = "p1_user_id", nullable = false)
    private Long p1UserId;

    @Column(name = "p1_name", nullable = false, length = 30)
    private String p1Name;

    @Column(name = "p2_user_id")
    private Long p2UserId;

    @Column(name = "p2_name", length = 30)
    private String p2Name;

    @Column(name = "state_json", nullable = false, length = 8000)
    private String stateJson;

    @Column(name = "current_player", nullable = false)
    private int currentPlayer;

    @Column(nullable = false)
    private int winner;

    @Column(nullable = false)
    private boolean finished;

    @Column(name = "p1_requested_rematch", nullable = false)
    private boolean p1RequestedRematch;

    @Column(name = "p2_requested_rematch", nullable = false)
    private boolean p2RequestedRematch;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TurnGameSnapshot() {
    }

    public TurnGameSnapshot(String code, String gameType, Long p1UserId, String p1Name, Long p2UserId,
            String p2Name, String stateJson, int currentPlayer, int winner, boolean finished,
            boolean p1RequestedRematch, boolean p2RequestedRematch) {
        this.code = code;
        this.gameType = gameType;
        this.p1UserId = p1UserId;
        this.p1Name = p1Name;
        this.p2UserId = p2UserId;
        this.p2Name = p2Name;
        this.stateJson = stateJson;
        this.currentPlayer = currentPlayer;
        this.winner = winner;
        this.finished = finished;
        this.p1RequestedRematch = p1RequestedRematch;
        this.p2RequestedRematch = p2RequestedRematch;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public String getCode() {
        return code;
    }

    public String getGameType() {
        return gameType;
    }

    public Long getP1UserId() {
        return p1UserId;
    }

    public String getP1Name() {
        return p1Name;
    }

    public Long getP2UserId() {
        return p2UserId;
    }

    public String getP2Name() {
        return p2Name;
    }

    public String getStateJson() {
        return stateJson;
    }

    public int getCurrentPlayer() {
        return currentPlayer;
    }

    public int getWinner() {
        return winner;
    }

    public boolean isFinished() {
        return finished;
    }

    public boolean isP1RequestedRematch() {
        return p1RequestedRematch;
    }

    public boolean isP2RequestedRematch() {
        return p2RequestedRematch;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
