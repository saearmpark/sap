package com.codestudio.board;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// 자료실 파일. 실제 파일 내용(data)도 디스크가 아니라 DB(Neon PostgreSQL)에 저장해서,
// 서버가 재시작/재배포되어도 업로드한 파일이 사라지지 않게 합니다.
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Entity
@Table(name = "files")
public class FileItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long sizeBytes;

    @Column(nullable = false)
    private String uploadedAt;

    // 파일의 실제 내용(바이트). 목록 조회 화면에는 필요 없으므로 JSON 응답에는 포함하지 않습니다.
    //
    // 주의: 여기서 @Lob을 쓰면 PostgreSQL에서 "Large Object"(OID) 방식으로 저장되는데,
    // 이 방식은 Neon처럼 커넥션 풀러(pgbouncer 등)를 쓰는 환경에서 세션이 끊기면서
    // 500 에러가 나는 경우가 많습니다. @Lob 없이 평범한 byte[] 컬럼으로 저장하면
    // PostgreSQL에서는 bytea(실제 값이 그대로 들어가는 방식)로 매핑되어 안전합니다.
    // length는 H2(로컬 개발용)에서 컬럼 크기를 20MB로 넉넉히 잡기 위한 설정이고,
    // PostgreSQL에서는 무시되고 항상 bytea로 저장됩니다.
    @Column(nullable = false, length = 20 * 1024 * 1024)
    @JsonIgnore
    private byte[] data;

    public FileItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(String uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }
}
