package com.codestudio.board;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:game-score-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class GameScoreRepositoryTest {

    @Autowired
    private GameScoreRepository scores;

    @Test
    void persistsAndRanksScores() {
        scores.save(new GameScore("panel-bo", 1L, "PlayerOne", 120));
        scores.save(new GameScore("panel-bo", 2L, "PlayerTwo", 340));
        scores.save(new GameScore("panel-bo", 3L, "PlayerThree", 210));
        scores.save(new GameScore("panel-sh", 1L, "PlayerOne", 999));

        GameScore restored = scores.findByGameIdAndUserId("panel-bo", 2L).orElseThrow();
        assertEquals(340, restored.getScore());
        assertNotNull(restored.getUpdatedAt());

        var ranking = scores.findTop10ByGameIdOrderByScoreDescUpdatedAtAsc("panel-bo");
        assertEquals(3, ranking.size());
        assertEquals("PlayerTwo", ranking.get(0).getPlayerName());
        assertEquals("PlayerThree", ranking.get(1).getPlayerName());
        assertEquals("PlayerOne", ranking.get(2).getPlayerName());
    }

    @Test
    void ranksScoresAscendingWhenLowerIsBetter() {
        scores.save(new GameScore("panel-reaction", 1L, "PlayerOne", 320));
        scores.save(new GameScore("panel-reaction", 2L, "PlayerTwo", 180));
        scores.save(new GameScore("panel-reaction", 3L, "PlayerThree", 260));

        var ranking = scores.findTop10ByGameIdOrderByScoreAscUpdatedAtAsc("panel-reaction");
        assertEquals(3, ranking.size());
        assertEquals("PlayerTwo", ranking.get(0).getPlayerName());
        assertEquals("PlayerThree", ranking.get(1).getPlayerName());
        assertEquals("PlayerOne", ranking.get(2).getPlayerName());
    }
}
