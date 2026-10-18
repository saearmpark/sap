package com.codestudio.board;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game-scores")
public class GameScoreController {

    private static final int MAX_NAME_LENGTH = 40;
    private static final long MAX_SCORE = 1_000_000_000L;

    private final GameScoreRepository scores;
    private final UserAccountRepository users;

    public GameScoreController(GameScoreRepository scores, UserAccountRepository users) {
        this.scores = scores;
        this.users = users;
    }

    @GetMapping
    public ResponseEntity<?> get(@RequestParam String gameId,
                                 @RequestParam(required = false) String order,
                                 Authentication authentication) {
        String id = normalizeGameId(gameId);
        if (id == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "게임 식별자가 올바르지 않습니다."));
        }

        long userId = (Long) authentication.getPrincipal();
        boolean ascending = isAscending(order);
        List<GameScore> ranking = ascending
                ? scores.findTop10ByGameIdOrderByScoreAscUpdatedAtAsc(id)
                : scores.findTop10ByGameIdOrderByScoreDescUpdatedAtAsc(id);
        List<Map<String, Object>> top = ranking.stream()
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("playerName", entry.getPlayerName());
                    row.put("score", entry.getScore());
                    row.put("updatedAt", entry.getUpdatedAt().toString());
                    return row;
                })
                .toList();
        long mine = scores.findByGameIdAndUserId(id, userId).map(GameScore::getScore).orElse(0L);

        return ResponseEntity.ok(Map.of("top", top, "mine", mine));
    }

    @PostMapping
    public ResponseEntity<?> submit(Authentication authentication, @RequestBody Map<String, Object> body) {
        String id = normalizeGameId(String.valueOf(body.getOrDefault("gameId", "")));
        if (id == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "게임 식별자가 올바르지 않습니다."));
        }

        Long score = parseScore(body.get("score"));
        if (score == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "점수가 올바르지 않습니다."));
        }

        boolean ascending = isAscending(String.valueOf(body.getOrDefault("order", "")));
        long userId = (Long) authentication.getPrincipal();
        String playerName = users.findById(userId)
                .map(UserAccount::getDisplayName)
                .orElseThrow(() -> new IllegalStateException("로그인 사용자 정보를 찾을 수 없습니다."));

        boolean improved = false;
        GameScore record = scores.findByGameIdAndUserId(id, userId).orElse(null);
        if (record == null) {
            record = new GameScore(id, userId, playerName, score);
            improved = true;
        } else if (ascending ? score < record.getScore() : score > record.getScore()) {
            record.setScore(score);
            record.setPlayerName(playerName);
            improved = true;
        } else {
            record.setPlayerName(playerName);
        }
        GameScore saved = scores.save(record);

        return ResponseEntity.ok(Map.of("bestScore", saved.getScore(), "improved", improved));
    }

    private boolean isAscending(String order) {
        return "asc".equalsIgnoreCase(order == null ? "" : order.trim());
    }

    private String normalizeGameId(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_NAME_LENGTH) {
            return null;
        }
        return trimmed;
    }

    private Long parseScore(Object value) {
        long parsed;
        if (value instanceof Number number) {
            parsed = number.longValue();
        } else {
            try {
                parsed = Long.parseLong(String.valueOf(value).trim());
            } catch (NumberFormatException error) {
                return null;
            }
        }
        if (parsed < 0 || parsed > MAX_SCORE) {
            return null;
        }
        return parsed;
    }
}
