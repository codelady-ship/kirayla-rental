package az.kirayla.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** A refresh token that is still usable. The id is the JWT's {@code jti}; the row is deleted on use or logout. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id private String id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    protected RefreshToken() {}

    public RefreshToken(String id, Long userId, LocalDateTime expiresAt) {
        this.id = id;
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    public String getId() { return id; }
    public Long getUserId() { return userId; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
