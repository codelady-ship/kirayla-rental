package az.kirayla.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "wishlist_items")
@IdClass(WishlistItem.Key.class)
public class WishlistItem {
    @Id @Column(name = "user_id") private Long userId;
    @Id @Column(name = "listing_id") private Long listingId;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public WishlistItem() {}
    public WishlistItem(Long userId, Long listingId) { this.userId = userId; this.listingId = listingId; }

    public Long getUserId() { return userId; }
    public Long getListingId() { return listingId; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public static class Key implements Serializable {
        private Long userId;
        private Long listingId;
        public Key() {}
        public Key(Long userId, Long listingId) { this.userId = userId; this.listingId = listingId; }
        @Override public boolean equals(Object o) {
            return o instanceof Key k && Objects.equals(userId, k.userId) && Objects.equals(listingId, k.listingId);
        }
        @Override public int hashCode() { return Objects.hash(userId, listingId); }
    }
}
