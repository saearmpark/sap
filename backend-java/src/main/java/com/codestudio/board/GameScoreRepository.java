package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameScoreRepository extends JpaRepository<GameScore, Long> {
    void deleteAllByUserId(Long userId);

    Optional<GameScore> findByGameIdAndUserId(String gameId, Long userId);

    List<GameScore> findTop10ByGameIdOrderByScoreDescUpdatedAtAsc(String gameId);

    List<GameScore> findTop10ByGameIdOrderByScoreAscUpdatedAtAsc(String gameId);
}
