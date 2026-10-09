package com.codestudio.board;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminAccountInitializer implements CommandLineRunner {
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;

    @Value("${sap.admin.username:}")
    private String username;

    @Value("${sap.admin.password:}")
    private String password;

    public AdminAccountInitializer(UserAccountRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean hasUsername = username != null && !username.isBlank();
        boolean hasPassword = password != null && !password.isBlank();
        if (!hasUsername && !hasPassword) return;
        if (!hasUsername || !hasPassword) {
            throw new IllegalStateException("관리자 계정은 SAP_ADMIN_USERNAME과 SAP_ADMIN_PASSWORD를 모두 설정해야 합니다.");
        }

        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        if (!normalizedUsername.matches("[a-z0-9_]{3,30}")) {
            throw new IllegalStateException("SAP_ADMIN_USERNAME은 영문 소문자, 숫자, 밑줄로 3~30자여야 합니다.");
        }
        if (password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("SAP_ADMIN_PASSWORD는 12자 이상, UTF-8 기준 72바이트 이하여야 합니다.");
        }

        UserAccount admin = users.findByUsername(normalizedUsername).orElse(null);
        if (admin == null) {
            admin = new UserAccount(normalizedUsername, "관리자", passwordEncoder.encode(password), "APPROVED", true);
        } else if (!admin.isAdministrator()) {
            throw new IllegalStateException("SAP_ADMIN_USERNAME이 기존 일반 계정과 중복됩니다. 사용하지 않은 관리자 아이디를 설정하세요.");
        }
        admin.promoteToAdministrator();
        users.save(admin);
    }
}
