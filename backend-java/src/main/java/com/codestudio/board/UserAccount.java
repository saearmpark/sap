package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_account")
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, length = 30)
    private String displayName;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    // Nullable for safe upgrades from accounts created before approval was added.
    @Column(length = 16)
    private String approvalStatus;

    private Boolean administrator;

    protected UserAccount() {}

    public UserAccount(String username, String displayName, String passwordHash) {
        this(username, displayName, passwordHash, "PENDING", false);
    }

    public UserAccount(String username, String displayName, String passwordHash, String approvalStatus, boolean administrator) {
        this.username = username;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.approvalStatus = approvalStatus;
        this.administrator = administrator;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public String getApprovalStatus() { return approvalStatus == null ? "PENDING" : approvalStatus; }
    public boolean isApproved() { return "APPROVED".equals(approvalStatus); }
    public boolean isAdministrator() { return Boolean.TRUE.equals(administrator); }

    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public void promoteToAdministrator() {
        this.approvalStatus = "APPROVED";
        this.administrator = true;
    }
}
