package com.codestudio.board;

public class FileItem {
    private Long id;
    private String originalFileName;
    private String storedFileName;
    private long fileSize;
    private String fileType;

    // 기본 생성자
    public FileItem() {
    }

    // 5개 필드를 포함하는 생성자 (FileController에서 호출하는 생성자)
    public FileItem(Long id, String originalFileName, String storedFileName, long fileSize, String fileType) {
        this.id = id;
        this.originalFileName = originalFileName;
        this.storedFileName = storedFileName;
        this.fileSize = fileSize;
        this.fileType = fileType;
    }

    // Getter & Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
    }

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
}