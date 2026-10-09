package com.codestudio.board;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    // Render 서버는 UTC로 돌기 때문에, 한국 시간으로 직접 변환해서 저장합니다.
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final PostRepository repository;
    private final UserAccountRepository users;

    public PostController(PostRepository repository, UserAccountRepository users) {
        this.repository = repository;
        this.users = users;
    }

    @GetMapping
    public List<Post> list() {
        return repository.findAllByOrderByIdDesc();
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

        if (title.isEmpty() || content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목과 내용을 모두 입력하세요."));
        }

        String authorName = users.findById((Long) authentication.getPrincipal())
                .map(UserAccount::getUsername)
                .orElseThrow(() -> new IllegalStateException("로그인 사용자 정보를 찾을 수 없습니다."));
        Post saved = repository.save(new Post(title, content, ZonedDateTime.now(KST).format(FORMATTER), authorName));
        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "message", "게시글이 등록되었습니다."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable long id) {
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }
}
