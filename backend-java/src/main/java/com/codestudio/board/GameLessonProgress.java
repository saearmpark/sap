package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "game_lesson_progress", uniqueConstraints = @UniqueConstraint(
        name = "uk_game_lesson_progress_user_lesson",
        columnNames = {"user_id", "lesson_id"}))
public class GameLessonProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "lesson_id", nullable = false, length = 32)
    private String lessonId;

    protected GameLessonProgress() {}

    public GameLessonProgress(Long userId, String lessonId) {
        this.userId = userId;
        this.lessonId = lessonId;
    }

    public Long getUserId() { return userId; }
    public String getLessonId() { return lessonId; }
}
