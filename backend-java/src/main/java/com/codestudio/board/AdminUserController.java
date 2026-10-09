package com.codestudio.board;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserAccountRepository users;

    public AdminUserController(UserAccountRepository users) {
        this.users = users;
    }

    @GetMapping("/pending")
    public List<Map<String, Object>> pendingUsers() {
        return users.findAllByApprovalStatusIsNullOrApprovalStatusOrderByIdAsc("PENDING").stream()
                .map(user -> Map.<String, Object>of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName(),
                        "approvalStatus", user.getApprovalStatus()))
                .toList();
    }

    @PutMapping("/{id}/approval")
    public ResponseEntity<?> decide(@PathVariable Long id, @RequestBody ApprovalRequest request) {
        if (!"APPROVED".equals(request.status()) && !"REJECTED".equals(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "승인 상태는 APPROVED 또는 REJECTED여야 합니다.");
        }
        UserAccount user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."));
        if (user.isAdministrator() || user.isApproved() || "REJECTED".equals(user.getApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "대기 중인 회원만 처리할 수 있습니다.");
        }
        user.setApprovalStatus(request.status());
        users.save(user);
        return ResponseEntity.ok(Map.of("message", "회원 상태를 변경했습니다.", "status", request.status()));
    }

    public record ApprovalRequest(String status) {}
}
