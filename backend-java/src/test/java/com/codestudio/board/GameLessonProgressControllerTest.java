package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

class GameLessonProgressControllerTest {
    private final GameLessonProgressRepository progress = org.mockito.Mockito.mock(GameLessonProgressRepository.class);
    private final GameLessonProgressController controller = new GameLessonProgressController(progress);
    private final Authentication user = new UsernamePasswordAuthenticationToken(42L, null, List.of());

    @Test
    void replacesOnlyTheAuthenticatedUsersProgress() {
        when(progress.findAllByUserIdOrderByLessonId(42L)).thenReturn(List.of(
                new GameLessonProgress(42L, "panel-ttt")));

        var result = controller.replace(user,
                new GameLessonProgressController.ProgressRequest(List.of("panel-bo", "panel-ttt")));

        assertEquals(List.of("panel-bo", "panel-ttt"), result.completedLessonIds());
        verify(progress).deleteAllByUserIdAndLessonIdNotIn(42L,
                new LinkedHashSet<>(List.of("panel-bo", "panel-ttt")));
        verify(progress).saveAll(anyList());
    }

    @Test
    void rejectsUnknownLessonIdsWithoutChangingStoredProgress() {
        assertThrows(ResponseStatusException.class, () -> controller.replace(user,
                new GameLessonProgressController.ProgressRequest(List.of("panel-admin"))));
        verify(progress, never()).deleteAllByUserId(42L);
        verify(progress, never()).saveAll(anyList());
    }
}
