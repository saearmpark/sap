package com.codestudio.board;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameLessonProgressRepository extends JpaRepository<GameLessonProgress, Long> {
    List<GameLessonProgress> findAllByUserIdOrderByLessonId(Long userId);
    void deleteAllByUserId(Long userId);
    void deleteAllByUserIdAndLessonIdNotIn(Long userId, Collection<String> lessonIds);
}
