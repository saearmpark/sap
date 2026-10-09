package com.codestudio.board;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserAccountRepository users;

    public AuthController(AuthService authService, UserAccountRepository users) {
        this.authService = authService;
        this.users = users;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        UserAccount user = authService.register(request.username(), request.displayName(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionResponse(user));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody AuthRequest request) {
        return sessionResponse(authService.authenticate(request.username(), request.password()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return users.findById(userId)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(), "username", user.getUsername(), "displayName", user.getDisplayName())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            authService.revokeToken(authorization.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃되었습니다."));
    }

    private Map<String, Object> sessionResponse(UserAccount user) {
        return Map.of("accessToken", authService.createToken(user.getId()),
                "id", user.getId(), "username", user.getUsername(), "displayName", user.getDisplayName());
    }

    public record AuthRequest(String username, String password, String displayName) {}
}
