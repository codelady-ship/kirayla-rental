package az.kirayla.web;

import az.kirayla.service.ConversationService;
import az.kirayla.service.HostService;
import az.kirayla.service.ListingService;
import az.kirayla.service.WishlistService;
import az.kirayla.web.dto.Dtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints scoped to the signed-in user: wishlist, conversations, host dashboard. */
@RestController
@Tag(name = "Wishlist, messages, host")
public class MeController {
    private final WishlistService wishlist;
    private final ConversationService conversations;
    private final HostService host;
    private final ListingService listings;

    public MeController(WishlistService wishlist, ConversationService conversations, HostService host,
                        ListingService listings) {
        this.wishlist = wishlist;
        this.conversations = conversations;
        this.host = host;
        this.listings = listings;
    }

    @GetMapping("/api/wishlist")
    public List<ListingCard> wishlist() {
        return wishlist.list();
    }

    @GetMapping("/api/wishlist/ids")
    public List<Long> wishlistIds() {
        return wishlist.ids();
    }

    @PutMapping("/api/wishlist/{listingId}")
    public ResponseEntity<Void> addToWishlist(@PathVariable Long listingId) {
        wishlist.add(listingId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/wishlist/{listingId}")
    public ResponseEntity<Void> removeFromWishlist(@PathVariable Long listingId) {
        wishlist.remove(listingId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/conversations")
    public List<ConversationDto> conversations() {
        return conversations.list();
    }

    @PostMapping("/api/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDto startConversation(@Valid @RequestBody StartConversationRequest req) {
        return conversations.start(req);
    }

    @GetMapping("/api/conversations/unread-count")
    public CountDto unread() {
        return conversations.unreadCount();
    }

    @GetMapping("/api/conversations/{id}/messages")
    public List<MessageDto> messages(@PathVariable Long id) {
        return conversations.messages(id);
    }

    @PostMapping("/api/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(@PathVariable Long id, @Valid @RequestBody SendMessageRequest req) {
        return conversations.send(id, req);
    }

    @GetMapping("/api/host/listings")
    public List<HostListing> hostListings() {
        return listings.hostListings();
    }

    @GetMapping("/api/host/earnings")
    public EarningsDto earnings() {
        return host.earnings();
    }
}
