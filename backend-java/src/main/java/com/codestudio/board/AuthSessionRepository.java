package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    void deleteAllByUserId(Long userId);
}
