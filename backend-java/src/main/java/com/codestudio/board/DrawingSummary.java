package com.codestudio.board;

import java.time.Instant;

public record DrawingSummary(Long id, long fileSize, Instant createdAt) {
    public DrawingSummary(Drawing drawing) {
        this(drawing.getId(), drawing.getFileSize(), drawing.getCreatedAt());
    }
}
