package com.codestudio.board;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final long TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
    private final UserAccountRepository users;
    private final AuthSessionRepository sessions;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${sap.admin.username:}")
    private String configuredAdminUsername;

    public AuthService(UserAccountRepository users, AuthSessionRepository sessions, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
    }

    public UserAccount register(String username, String displayName, String password) {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        String normalizedName = displayName == null ? "" : displayName.trim();
        if (configuredAdminUsername == null || configuredAdminUsername.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "관리자 계정 설정이 완료된 뒤 회원가입할 수 있습니다.");
        }
        if (normalizedUsername.equals(configuredAdminUsername.trim().toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "관리자 전용 아이디입니다.");
        }
        if (!normalizedUsername.matches("[a-z0-9_]{3,30}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 영문 소문자, 숫자, 밑줄로 3~30자 입력하세요.");
        }
        if (normalizedName.isBlank() || normalizedName.length() > 30) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "표시 이름은 1~30자로 입력하세요.");
        }
        if (password == null || password.length() < 8 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력하세요.");
        }
        if (users.existsByUsername(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }
        return users.save(new UserAccount(normalizedUsername, normalizedName, passwordEncoder.encode(password)));
    }

    public UserAccount authenticate(String username, String password) {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        UserAccount user = users.findByUsername(normalizedUsername)
                .filter(account -> password != null && passwordEncoder.matches(password, account.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호를 확인하세요."));
        if ("REJECTED".equals(user.getApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "회원가입 신청이 승인되지 않았습니다. 관리자에게 문의하세요.");
        }
        if (!user.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
        }
        return user;
    }

    public String createToken(Long userId) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessions.save(new AuthSession(hashToken(token), userId, Instant.now().plusSeconds(TOKEN_LIFETIME_SECONDS)));
        return token;
    }

    public UserIdentity identityForToken(String token) {
        AuthSession session = sessions.findById(hashToken(token)).orElse(null);
        if (session == null) return null;
        if (session.getExpiresAt().isBefore(Instant.now())) {
            sessions.deleteById(hashToken(token));
            return null;
        }
        UserAccount user = users.findById(session.getUserId()).orElse(null);
        if (user == null || !user.isApproved()) {
            sessions.deleteById(hashToken(token));
            return null;
        }
        return new UserIdentity(user.getId(), user.isAdministrator());
    }

    public void revokeToken(String token) {
        if (token != null) sessions.deleteById(hashToken(token));
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    public record UserIdentity(Long userId, boolean administrator) {}
}
