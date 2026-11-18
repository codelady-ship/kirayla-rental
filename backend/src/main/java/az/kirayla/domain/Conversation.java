package az.kirayla.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "listing_id") private Listing listing;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "renter_id") private User renter;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "host_id") private User host;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "last_message_at", nullable = false) private LocalDateTime lastMessageAt = LocalDateTime.now();

    public boolean hasParticipant(Long userId) {
        return renter.getId().equals(userId) || host.getId().equals(userId);
    }

    public Long getId() { return id; }
    public Listing getListing() { return listing; }
    public void setListing(Listing listing) { this.listing = listing; }
    public User getRenter() { return renter; }
    public void setRenter(User renter) { this.renter = renter; }
    public User getHost() { return host; }
    public void setHost(User host) { this.host = host; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }
}
