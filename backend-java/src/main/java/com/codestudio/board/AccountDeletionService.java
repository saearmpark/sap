package com.codestudio.board;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountDeletionService {
    private final UserAccountRepository users;
    private final AuthSessionRepository sessions;
    private final PasswordEncoder passwordEncoder;
    private final PostRepository posts;
    private final PostCommentRepository comments;
    private final FileItemRepository files;
    private final DrawingRepository drawings;
    private final CalendarEventRepository events;
    private final ChatMessageRepository chatMessages;
    private final GameScoreRepository gameScores;

    public AccountDeletionService(
            UserAccountRepository users,
            AuthSessionRepository sessions,
            PasswordEncoder passwordEncoder,
            PostRepository posts,
            PostCommentRepository comments,
            FileItemRepository files,
            DrawingRepository drawings,
            CalendarEventRepository events,
            ChatMessageRepository chatMessages,
            GameScoreRepository gameScores) {
        this.users = users;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
        this.posts = posts;
        this.comments = comments;
        this.files = files;
        this.drawings = drawings;
        this.events = events;
        this.chatMessages = chatMessages;
        this.gameScores = gameScores;
    }

    @Transactional
    public void deleteAccount(long userId, String password) {
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 정보를 찾을 수 없습니다."));
        if (password == null || password.isBlank()
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 올바르지 않습니다.");
        }

        String username = user.getUsername();
        List<Post> ownedPosts = posts.findAllByAuthorName(username);
        for (Post post : ownedPosts) {
            comments.deleteAllByPostId(post.getId());
        }
        comments.deleteAllByAuthorName(username);
        posts.deleteAllByAuthorName(username);
        files.deleteAllByAuthorName(username);
        drawings.deleteAllByOwnerId(userId);
        events.deleteAllByOwnerId(userId);
        chatMessages.deleteAllBySenderIdOrRecipientId(userId, userId);
        gameScores.deleteAllByUserId(userId);
        sessions.deleteAllByUserId(userId);
        users.delete(user);
    }
}
