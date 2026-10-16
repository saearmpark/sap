package com.codestudio.board;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/game-progress")
public class GameLessonProgressController {
    private static final Set<String> LESSON_IDS = Set.of(
            "panel-ttt", "panel-bo", "panel-sh", "panel-pz", "panel-sn", "panel-tt", "panel-2048",
            "panel-mole", "panel-pong", "panel-gyeol", "panel-dodge", "panel-sudoku", "panel-memory",
            "panel-rps", "panel-guess", "panel-reaction", "panel-connect", "panel-mines", "panel-math",
            "panel-gomoku", "panel-animal-shogi", "panel-runner", "panel-word-chain", "panel-blackjack",
            "panel-holdem", "panel-dots-boxes", "panel-dodge-rocks", "panel-typing", "panel-baseball",
            "panel-sequence", "panel-othello", "panel-checkers", "panel-chess", "panel-janggi", "panel-yut",
            "panel-fighter", "panel-pac", "panel-frog", "panel-bomber");

    private final GameLessonProgressRepository progress;

    public GameLessonProgressController(GameLessonProgressRepository progress) {
        this.progress = progress;
    }

    @GetMapping
    public ProgressResponse get(Authentication authentication) {
        Long userId = userId(authentication);
        return new ProgressResponse(progress.findAllByUserIdOrderByLessonId(userId).stream()
                .map(GameLessonProgress::getLessonId).toList());
    }

    @PutMapping
    @Transactional
    public ProgressResponse replace(Authentication authentication, @RequestBody ProgressRequest request) {
        if (request == null || request.completedLessonIds() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "완료한 학습 목록을 입력하세요.");
        }
        LinkedHashSet<String> lessonIds = new LinkedHashSet<>(request.completedLessonIds());
        if (lessonIds.size() != request.completedLessonIds().size() || lessonIds.size() > LESSON_IDS.size()
                || !LESSON_IDS.containsAll(lessonIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 학습 항목이 포함되어 있습니다.");
        }

        Long userId = userId(authentication);
        if (lessonIds.isEmpty()) {
            progress.deleteAllByUserId(userId);
        } else {
            Set<String> existing = progress.findAllByUserIdOrderByLessonId(userId).stream()
                    .map(GameLessonProgress::getLessonId).collect(java.util.stream.Collectors.toSet());
            progress.deleteAllByUserIdAndLessonIdNotIn(userId, lessonIds);
            progress.saveAll(lessonIds.stream().filter(id -> !existing.contains(id))
                    .map(id -> new GameLessonProgress(userId, id)).toList());
        }
        return new ProgressResponse(List.copyOf(lessonIds));
    }

    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }

    public record ProgressRequest(List<String> completedLessonIds) {}
    public record ProgressResponse(List<String> completedLessonIds) {}
}
