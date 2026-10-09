package com.codestudio.board;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

@Entity
@Table(name = "file_item")
public class FileItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String originalFileName;
    private String storedFileName;
    private long fileSize;
    private String fileType;
    private String uploadedAt;
    private String authorName;
    @Column(name = "file_data")
    private byte[] data;

    // 기본 생성자
    public FileItem() {
    }

    // 파일 메타데이터를 초기화하는 생성자
    public FileItem(String originalFileName, String storedFileName, long fileSize, String fileType, String uploadedAt, String authorName, byte[] data) {
        this.originalFileName = originalFileName;
        this.storedFileName = storedFileName;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.uploadedAt = uploadedAt;
        this.authorName = authorName;
        this.data = data;
    }

    // Getter & Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @JsonProperty("original_name")
    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    @JsonProperty("stored_name")
    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

    @JsonProperty("size_bytes")
    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    @JsonProperty("uploaded_at")
    public String getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(String uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    @JsonProperty("author_name")
    public String getAuthorName() { return authorName; }

    public void setAuthorName(String authorName) { this.authorName = authorName; }

    @JsonIgnore
    public byte[] getData() { return data; }

    public void setData(byte[] data) { this.data = data; }
}
