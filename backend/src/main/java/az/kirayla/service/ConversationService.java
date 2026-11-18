package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.domain.*;
import az.kirayla.repo.*;
import az.kirayla.security.CurrentUser;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** One simple thread per (listing, renter) pair between the renter and the listing's host. */
@Service
public class ConversationService {
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ListingRepository listings;
    private final UserRepository users;
    private final Mapper mapper;

    public ConversationService(ConversationRepository conversations, MessageRepository messages,
                               ListingRepository listings, UserRepository users, Mapper mapper) {
        this.conversations = conversations;
        this.messages = messages;
        this.listings = listings;
        this.users = users;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> list() {
        Long me = CurrentUser.id();
        return conversations.findForUser(me).stream().map(c -> toDto(c, me)).toList();
    }

    @Transactional
    public ConversationDto start(StartConversationRequest req) {
        Long me = CurrentUser.id();
        Listing l = listings.findById(req.listingId())
                .filter(x -> x.getStatus() != ListingStatus.ARCHIVED)
                .orElseThrow(() -> ApiException.notFound("Listing"));
        if (l.getOwner().getId().equals(me)) throw ApiException.forbidden("You cannot message yourself about your own listing");
        Conversation c = append(l, me, me, req.body().trim());
        return toDto(c, me);
    }

    @Transactional
    public List<MessageDto> messages(Long conversationId) {
        Long me = CurrentUser.id();
        Conversation c = participantOf(conversationId, me);
        messages.markRead(c.getId(), me, LocalDateTime.now());
        return messages.findByConversationIdOrderByCreatedAtAscIdAsc(c.getId()).stream()
                .map(m -> toDto(m, me)).toList();
    }

    @Transactional
    public MessageDto send(Long conversationId, SendMessageRequest req) {
        Long me = CurrentUser.id();
        Conversation c = participantOf(conversationId, me);
        Message m = save(c, me, req.body().trim());
        return toDto(m, me);
    }

    @Transactional(readOnly = true)
    public CountDto unreadCount() {
        return new CountDto(messages.countUnreadForUser(CurrentUser.id()));
    }

    /** Finds or creates the (listing, renter) thread and appends a message from {@code senderId}. */
    @Transactional
    public Conversation append(Listing listing, Long renterId, Long senderId, String body) {
        Conversation c = conversations.findByListingIdAndRenterId(listing.getId(), renterId).orElseGet(() -> {
            Conversation n = new Conversation();
            n.setListing(listing);
            n.setRenter(users.getReferenceById(renterId));
            n.setHost(listing.getOwner());
            return conversations.saveAndFlush(n);
        });
        save(c, senderId, body);
        return c;
    }

    private Message save(Conversation c, Long senderId, String body) {
        Message m = new Message();
        m.setConversation(c);
        m.setSender(users.getReferenceById(senderId));
        m.setBody(body);
        c.setLastMessageAt(LocalDateTime.now());
        return messages.save(m);
    }

    private Conversation participantOf(Long id, Long me) {
        Conversation c = conversations.findById(id).orElseThrow(() -> ApiException.notFound("Conversation"));
        if (!c.hasParticipant(me)) throw ApiException.notFound("Conversation");
        return c;
    }

    private ConversationDto toDto(Conversation c, Long me) {
        User other = c.getRenter().getId().equals(me) ? c.getHost() : c.getRenter();
        Listing l = c.getListing();
        String last = messages.findFirstByConversationIdOrderByCreatedAtDescIdDesc(c.getId())
                .map(Message::getBody).orElse(null);
        return new ConversationDto(c.getId(), new ConversationListingRef(l.getId(), l.getTitle(), l.coverUrl()),
                mapper.ref(other), last, c.getLastMessageAt(), messages.countUnread(c.getId(), me));
    }

    private static MessageDto toDto(Message m, Long me) {
        return new MessageDto(m.getId(), m.getSender().getId(), m.getBody(), m.getCreatedAt(),
                m.getSender().getId().equals(me));
    }
}
