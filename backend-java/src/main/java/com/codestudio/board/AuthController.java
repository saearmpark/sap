package com.codestudio.board;

import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserAccountRepository users;
    private final AccountDeletionService accountDeletion;
    private final ObjectMapper objectMapper;

    public AuthController(AuthService authService, UserAccountRepository users, AccountDeletionService accountDeletion, ObjectMapper objectMapper) {
        this.authService = authService;
        this.users = users;
        this.accountDeletion = accountDeletion;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        authService.register(request.username(), request.displayName(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "가입이 완료되었습니다. 이제 로그인할 수 있습니다."));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody AuthRequest request) {
        return sessionResponse(authService.authenticate(request.username(), request.password()));
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request, Authentication authentication) {
        long userId = (Long) authentication.getPrincipal();
        authService.changePassword(userId, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다. 다시 로그인해주세요."));
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMe(Authentication authentication, @RequestBody(required = false) Map<String, String> body) {
        long userId = (Long) authentication.getPrincipal();
        String password = body == null ? "" : body.getOrDefault("password", "");
        accountDeletion.deleteAccount(userId, password);
        return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        long userId = (Long) authentication.getPrincipal();
        return users.findById(userId)
                .<ResponseEntity<?>>map(user -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("id", user.getId()); result.put("username", user.getUsername());
                    result.put("displayName", user.getDisplayName()); result.put("email", user.getEmail());
                    result.put("phone", user.getPhone()); result.put("profileNote", user.getProfileNote());
                    result.put("address", user.getAddress()); result.put("birthDate", user.getBirthDate());
                    result.put("height", user.getHeight()); result.put("weight", user.getWeight());
                    result.put("customFields", readCustomFields(user.getCustomProfileFields()));
                    result.put("isAdmin", user.isAdministrator());
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileRequest request, Authentication authentication) {
        long userId = (Long) authentication.getPrincipal();
        return users.findById(userId).map(user -> {
            String displayName = request.displayName() == null ? "" : request.displayName().trim();
            if (displayName.isBlank() || displayName.length() > 30) {
                return ResponseEntity.badRequest().body(Map.of("message", "표시 이름은 1~30자로 입력하세요."));
            }
            user.setDisplayName(displayName);
            user.setEmail(trim(request.email(), 120));
            user.setPhone(trim(request.phone(), 30));
            user.setProfileNote(trim(request.profileNote(), 500));
            user.setAddress(trim(request.address(), 300));
            user.setBirthDate(trim(request.birthDate(), 10));
            user.setHeight(trim(request.height(), 20));
            user.setWeight(trim(request.weight(), 20));
            try { user.setCustomProfileFields(objectMapper.writeValueAsString(request.customFields() == null ? Map.of() : request.customFields())); }
            catch (JsonProcessingException error) { return ResponseEntity.badRequest().body(Map.of("message", "추가 항목을 저장하지 못했습니다.")); }
            users.save(user);
            Map<String, Object> result = new HashMap<>();
            result.put("displayName", user.getDisplayName());
            result.put("email", user.getEmail());
            result.put("phone", user.getPhone());
            result.put("profileNote", user.getProfileNote());
            result.put("address", user.getAddress()); result.put("birthDate", user.getBirthDate());
            result.put("height", user.getHeight()); result.put("weight", user.getWeight());
            result.put("customFields", readCustomFields(user.getCustomProfileFields()));
            return ResponseEntity.ok(result);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    private Map<String, String> readCustomFields(String value) {
        if (value == null || value.isBlank()) return new HashMap<>();
        try { return objectMapper.readValue(value, new TypeReference<>() {}); }
        catch (Exception ignored) { return new HashMap<>(); }
    }

    private static String trim(String value, int max) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            authService.revokeToken(authorization.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃되었습니다."));
    }

    private Map<String, Object> sessionResponse(UserAccount user) {
        return Map.of("accessToken", authService.createToken(java.util.Objects.requireNonNull(user.getId())),
                "id", user.getId(), "username", user.getUsername(), "displayName", user.getDisplayName(),
                "isAdmin", user.isAdministrator());
    }

    public record AuthRequest(String username, String password, String displayName) {}
    public record PasswordChangeRequest(String currentPassword, String newPassword) {}
    public record ProfileRequest(String displayName, String email, String phone, String profileNote, String address,
                                 String birthDate, String height, String weight, Map<String, String> customFields) {}
}
