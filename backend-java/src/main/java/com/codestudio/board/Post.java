package com.codestudio.board;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// JSON으로 내보낼 때 createdAt -> created_at 처럼 snake_case로 바꿔줍니다.
// board.html이 Flask API와 똑같은 모양(created_at)을 기대하기 때문에, 두 백엔드를
// 그대로 바꿔 끼워 쓸 수 있도록(API 호환) 여기서 이름 규칙을 맞춰줍니다.
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 4000)
    private String content;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    public Post() {
    }

    public Post(String title, String content, String createdAt) {
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
