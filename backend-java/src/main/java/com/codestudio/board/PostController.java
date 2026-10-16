package com.codestudio.board;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    // Render 서버는 UTC로 돌기 때문에, 한국 시간으로 직접 변환해서 저장합니다.
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Set<String> CATEGORIES = Set.of("공지", "학습일지", "질문", "자유");

    private final PostRepository repository;
    private final PostCommentRepository comments;
    private final UserAccountRepository users;

    public PostController(PostRepository repository, PostCommentRepository comments, UserAccountRepository users) {
        this.repository = repository;
        this.comments = comments;
        this.users = users;
    }

    @GetMapping
    public List<Post> list(@RequestParam(required = false) String q, @RequestParam(required = false) String category) {
        String keyword = q == null ? "" : q.trim().toLowerCase();
        String filter = category == null ? "" : category.trim();
        return repository.findAllByOrderByIdDesc().stream()
                .filter(post -> filter.isEmpty() || "전체".equals(filter) || filter.equals(post.getCategory()))
                .filter(post -> keyword.isEmpty()
                        || post.getTitle().toLowerCase().contains(keyword)
                        || post.getContent().toLowerCase().contains(keyword))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable long id) {
        return repository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication, @RequestBody Map<String, String> body) {
        String title = (body.getOrDefault("title", "")).trim();
        String content = (body.getOrDefault("content", "")).trim();
        String category = (body.getOrDefault("category", "")).trim();

        if (title.isEmpty() || content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목과 내용을 모두 입력하세요."));
        }
        if (!category.isEmpty() && !CATEGORIES.contains(category)) {
            return ResponseEntity.badRequest().body(Map.of("error", "지원하지 않는 분류입니다."));
        }

        String authorName = username(authentication);
        Post saved = repository.save(new Post(title, content, now(), authorName, category.isEmpty() ? null : category));
        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "message", "게시글이 등록되었습니다."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable long id, Authentication authentication, @RequestBody Map<String, String> body) {
        Post post = repository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        if (!canModify(post, authentication)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        String title = (body.getOrDefault("title", post.getTitle())).trim();
        String content = (body.getOrDefault("content", post.getContent())).trim();
        String category = (body.getOrDefault("category", post.getCategory() == null ? "" : post.getCategory())).trim();

        if (title.isEmpty() || content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목과 내용을 모두 입력하세요."));
        }
        if (!category.isEmpty() && !CATEGORIES.contains(category)) {
            return ResponseEntity.badRequest().body(Map.of("error", "지원하지 않는 분류입니다."));
        }

        post.setTitle(title);
        post.setContent(content);
        post.setCategory(category.isEmpty() ? null : category);
        repository.save(post);
        return ResponseEntity.ok(Map.of("message", "수정되었습니다."));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable long id, Authentication authentication) {
        Post post = repository.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();
        if (!canModify(post, authentication)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        comments.deleteAllByPostId(id);
        repository.delete(post);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<?> listComments(@PathVariable long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(comments.findAllByPostIdOrderByIdAsc(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable long id, Authentication authentication, @RequestBody Map<String, String> body) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        String content = (body.getOrDefault("content", "")).trim();
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "댓글 내용을 입력하세요."));
        }
        if (content.length() > 2000) content = content.substring(0, 2000);
        PostComment saved = comments.save(new PostComment(id, content, now(), username(authentication)));
        return ResponseEntity.status(201).body(saved);
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable long id, @PathVariable long commentId, Authentication authentication) {
        PostComment comment = comments.findById(commentId).orElse(null);
        if (comment == null || !comment.getPostId().equals(id)) return ResponseEntity.notFound().build();
        if (!canModifyComment(comment, authentication)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        comments.delete(comment);
        return ResponseEntity.ok(Map.of("message", "댓글이 삭제되었습니다."));
    }

    private String now() {
        return ZonedDateTime.now(KST).format(FORMATTER);
    }

    private String username(Authentication authentication) {
        long userId = (Long) authentication.getPrincipal();
        return users.findById(userId).map(user -> user.getUsername())
                .orElseThrow(() -> new IllegalStateException("로그인 사용자 정보를 찾을 수 없습니다."));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private boolean canModify(Post post, Authentication authentication) {
        return isAdmin(authentication) || username(authentication).equals(post.getAuthorName());
    }

    private boolean canModifyComment(PostComment comment, Authentication authentication) {
        return isAdmin(authentication) || username(authentication).equals(comment.getAuthorName());
    }
}
