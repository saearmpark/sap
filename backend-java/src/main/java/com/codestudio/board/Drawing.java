package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "drawing")
public class Drawing {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(name = "image_data", nullable = false, length = 5 * 1024 * 1024)
    private byte[] data;

    protected Drawing() {
    }

    public Drawing(Long ownerId, byte[] data) {
        this.ownerId = ownerId;
        this.data = data;
        this.fileSize = data.length;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public long getFileSize() {
        return fileSize;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public byte[] getData() {
        return data;
    }
}
