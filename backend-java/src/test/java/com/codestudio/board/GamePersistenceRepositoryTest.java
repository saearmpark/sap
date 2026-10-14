package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:game-persistence-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class GamePersistenceRepositoryTest {
    @Autowired
    private GameRoomSnapshotRepository rooms;

    @Autowired
    private GameLessonProgressRepository progress;

    @Test
    void persistsGameStateAndLessonProgress() {
        rooms.save(new GameRoomSnapshot("ABC234", 1L, "Player X", 2L, "Player O",
                "----X----", "O", null, false, true, false));
        progress.save(new GameLessonProgress(1L, "panel-ttt"));

        GameRoomSnapshot restoredRoom = rooms.findById("ABC234").orElseThrow();
        assertEquals("----X----", restoredRoom.getCells());
        assertEquals("O", restoredRoom.getCurrentMark());
        assertNotNull(restoredRoom.getUpdatedAt());
        assertEquals("panel-ttt", progress.findAllByUserIdOrderByLessonId(1L).get(0).getLessonId());
    }
}
