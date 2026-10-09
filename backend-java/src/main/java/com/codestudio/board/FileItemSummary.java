package com.codestudio.board;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Metadata-only projection so listing files never loads their binary contents. */
public interface FileItemSummary {
    Long getId();

    @JsonProperty("original_name")
    String getOriginalFileName();

    @JsonProperty("stored_name")
    String getStoredFileName();

    @JsonProperty("size_bytes")
    long getFileSize();

    String getFileType();

    @JsonProperty("uploaded_at")
    String getUploadedAt();

    @JsonProperty("author_name")
    String getAuthorName();
}
