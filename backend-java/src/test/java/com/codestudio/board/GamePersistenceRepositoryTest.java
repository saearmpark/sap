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

    @Test
    void persistsGameState() {
        rooms.save(new GameRoomSnapshot("ABC234", 1L, "Player X", 2L, "Player O",
                "----X----", "O", null, false, true, false));

        GameRoomSnapshot restoredRoom = rooms.findById("ABC234").orElseThrow();
        assertEquals("----X----", restoredRoom.getCells());
        assertEquals("O", restoredRoom.getCurrentMark());
        assertNotNull(restoredRoom.getUpdatedAt());
    }
}
