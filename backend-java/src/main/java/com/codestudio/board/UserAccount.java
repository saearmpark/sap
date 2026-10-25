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

    @Column(length = 120)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 500)
    private String profileNote;

    @Column(length = 300)
    private String address;
    @Column(length = 10)
    private String birthDate;
    @Column(length = 20)
    private String height;
    @Column(length = 20)
    private String weight;
    @Column(length = 4000)
    private String customProfileFields;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    // Nullable for safe upgrades from accounts created before approval was added.
    @Column(length = 16)
    private String approvalStatus;

    private Boolean administrator;

    protected UserAccount() {}

    public UserAccount(String username, String displayName, String passwordHash) {
        this(username, displayName, passwordHash, "APPROVED", false);
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
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getProfileNote() { return profileNote; }
    public String getAddress() { return address; }
    public String getBirthDate() { return birthDate; }
    public String getHeight() { return height; }
    public String getWeight() { return weight; }
    public String getCustomProfileFields() { return customProfileFields; }
    public String getPasswordHash() { return passwordHash; }
    public String getApprovalStatus() { return approvalStatus == null ? "PENDING" : approvalStatus; }
    public boolean isApproved() { return "APPROVED".equals(approvalStatus); }
    public boolean isAdministrator() { return Boolean.TRUE.equals(administrator); }

    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setEmail(String email) { this.email = email; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setProfileNote(String profileNote) { this.profileNote = profileNote; }
    public void setAddress(String address) { this.address = address; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }
    public void setHeight(String height) { this.height = height; }
    public void setWeight(String weight) { this.weight = weight; }
    public void setCustomProfileFields(String customProfileFields) { this.customProfileFields = customProfileFields; }

    public void promoteToAdministrator() {
        this.approvalStatus = "APPROVED";
        this.administrator = true;
    }
}
