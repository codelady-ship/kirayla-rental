package az.kirayla.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "conversation_id") private Conversation conversation;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sender_id") private User sender;
    @Column(nullable = false) private String body;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "read_at") private LocalDateTime readAt;

    public Long getId() { return id; }
    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
