package com.codestudio.board;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsername(String username);
    boolean existsByUsername(String username);
    List<UserAccount> findAllByApprovalStatusIsNullOrApprovalStatusOrderByIdAsc(String approvalStatus);
}
