package com.codestudio.board;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "game_room_snapshot")
public class GameRoomSnapshot {
    @Id
    @Column(length = 6)
    private String code;

    @Column(nullable = false)
    private Long xUserId;

    @Column(nullable = false, length = 30)
    private String xName;

    private Long oUserId;

    @Column(length = 30)
    private String oName;

    @Column(nullable = false, length = 9)
    private String cells;

    @Column(nullable = false, length = 1)
    private String currentMark;

    @Column(length = 5)
    private String winner;

    @Column(nullable = false)
    private boolean finished;

    @Column(nullable = false)
    private boolean xRequestedRematch;

    @Column(nullable = false)
    private boolean oRequestedRematch;

    @Column(nullable = false)
    private Instant updatedAt;

    protected GameRoomSnapshot() {}

    public GameRoomSnapshot(String code, Long xUserId, String xName, Long oUserId, String oName,
            String cells, String currentMark, String winner, boolean finished,
            boolean xRequestedRematch, boolean oRequestedRematch) {
        this.code = code;
        this.xUserId = xUserId;
        this.xName = xName;
        this.oUserId = oUserId;
        this.oName = oName;
        this.cells = cells;
        this.currentMark = currentMark;
        this.winner = winner;
        this.finished = finished;
        this.xRequestedRematch = xRequestedRematch;
        this.oRequestedRematch = oRequestedRematch;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public String getCode() { return code; }
    public Long getXUserId() { return xUserId; }
    public String getXName() { return xName; }
    public Long getOUserId() { return oUserId; }
    public String getOName() { return oName; }
    public String getCells() { return cells; }
    public String getCurrentMark() { return currentMark; }
    public String getWinner() { return winner; }
    public boolean isFinished() { return finished; }
    public boolean isXRequestedRematch() { return xRequestedRematch; }
    public boolean isORequestedRematch() { return oRequestedRematch; }
    public Instant getUpdatedAt() { return updatedAt; }
}
