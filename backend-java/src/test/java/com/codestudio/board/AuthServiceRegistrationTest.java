package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class AuthServiceRegistrationTest {
    private final UserAccountRepository users = org.mockito.Mockito.mock(UserAccountRepository.class);
    private final AuthSessionRepository sessions = org.mockito.Mockito.mock(AuthSessionRepository.class);
    private final AuthService auth = new AuthService(users, sessions, new BCryptPasswordEncoder());

    @BeforeEach
    void configureReservedAdminUsername() {
        ReflectionTestUtils.setField(auth, "configuredAdminUsername", "site_admin");
    }

    @Test
    void newRegistrationIsApprovedAndCanLogInImmediately() {
        when(users.existsByUsername("new_student")).thenReturn(false);
        when(users.save(org.mockito.ArgumentMatchers.any(UserAccount.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount registered = auth.register("New_Student", "New Student", "safe-password-123");
        when(users.findByUsername("new_student")).thenReturn(Optional.of(registered));

        assertEquals("APPROVED", registered.getApprovalStatus());
        assertEquals(registered, auth.authenticate("new_student", "safe-password-123"));
    }

    @Test
    void registrationCannotClaimConfiguredAdminUsername() {
        assertThrows(ResponseStatusException.class,
                () -> auth.register("SITE_ADMIN", "Impersonator", "safe-password-123"));

        verify(users, never()).save(org.mockito.ArgumentMatchers.any(UserAccount.class));
    }
}
