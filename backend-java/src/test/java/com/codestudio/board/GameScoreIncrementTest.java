package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class GameScoreIncrementTest {
    @Test
    void incrementAddsToOneWinTotal() {
        GameScoreRepository scores = mock(GameScoreRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        UserAccount user = mock(UserAccount.class);
        when(user.getDisplayName()).thenReturn("Tester");
        when(users.findById(1L)).thenReturn(Optional.of(user));

        GameScore existing = new GameScore("panel-ttt", 1L, "Tester", 5);
        when(scores.findByGameIdAndUserId("panel-ttt", 1L)).thenReturn(Optional.of(existing));
        when(scores.save(any(GameScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(1L);

        GameScoreController controller = new GameScoreController(scores, users);
        var response = controller.submit(authentication,
                Map.of("gameId", "panel-ttt", "score", 1, "increment", true, "order", "desc"));

        assertEquals(200, response.getStatusCode().value());
        assertEquals(6, existing.getScore());
    }
}
