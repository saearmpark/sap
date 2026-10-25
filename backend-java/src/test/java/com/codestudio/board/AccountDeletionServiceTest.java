package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class AccountDeletionServiceTest {
    private final UserAccountRepository users = mock(UserAccountRepository.class);
    private final AuthSessionRepository sessions = mock(AuthSessionRepository.class);
    private final PostRepository posts = mock(PostRepository.class);
    private final PostCommentRepository comments = mock(PostCommentRepository.class);
    private final FileItemRepository files = mock(FileItemRepository.class);
    private final DrawingRepository drawings = mock(DrawingRepository.class);
    private final CalendarEventRepository events = mock(CalendarEventRepository.class);
    private final ChatMessageRepository chatMessages = mock(ChatMessageRepository.class);
    private final GameScoreRepository gameScores = mock(GameScoreRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    private AccountDeletionService service() {
        return new AccountDeletionService(users, sessions, encoder, posts, comments, files,
                drawings, events, chatMessages, gameScores);
    }

    @Test
    void deletesOwnedContentAndAccount() {
        UserAccount user = new UserAccount("tester", "Tester", encoder.encode("secret"));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        Post post = new Post("t", "c", "2026-10-25", "tester", null);
        ReflectionTestUtils.setField(post, "id", 10L);
        when(posts.findAllByAuthorName("tester")).thenReturn(List.of(post));

        service().deleteAccount(1L, "secret");

        verify(comments).deleteAllByPostId(10L);
        verify(comments).deleteAllByAuthorName("tester");
        verify(posts).deleteAllByAuthorName("tester");
        verify(files).deleteAllByAuthorName("tester");
        verify(drawings).deleteAllByOwnerId(1L);
        verify(events).deleteAllByOwnerId(1L);
        verify(chatMessages).deleteAllBySenderIdOrRecipientId(1L, 1L);
        verify(gameScores).deleteAllByUserId(1L);
        verify(sessions).deleteAllByUserId(1L);
        verify(users).delete(user);
    }

    @Test
    void rejectsWrongPasswordWithoutDeletingAnything() {
        UserAccount user = new UserAccount("tester", "Tester", encoder.encode("secret"));
        when(users.findById(1L)).thenReturn(Optional.of(user));

        assertThrows(ResponseStatusException.class, () -> service().deleteAccount(1L, "wrong"));

        verify(users, never()).delete(user);
        verifyNoInteractions(posts, comments, files, drawings, events, chatMessages, gameScores, sessions);
    }
}
