package az.kirayla.service;

import az.kirayla.domain.*;
import az.kirayla.repo.*;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Entity → DTO conversion. Call inside a transaction (lazy associations). */
@Component
public class Mapper {
    private final ListingRepository listings;
    private final ReviewRepository reviews;
    private final ConversationRepository conversations;

    public Mapper(ListingRepository listings, ReviewRepository reviews, ConversationRepository conversations) {
        this.listings = listings;
        this.reviews = reviews;
        this.conversations = conversations;
    }

    public UserDto user(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.getCity(), u.getBio(),
                u.getAvatarUrl(), u.getCreatedAt(), u.isDemoReadOnly());
    }

    public UserRef ref(User u) {
        return new UserRef(u.getId(), u.getFullName(), u.getAvatarUrl());
    }

    public PublicUser publicUser(User u) {
        long listingCount = listings.countByOwnerIdAndStatus(u.getId(), ListingStatus.ACTIVE);
        Double avg = reviews.averageForOwner(u.getId());
        long count = reviews.countForOwner(u.getId());
        double rating = avg == null ? 0 : BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP).doubleValue();
        return new PublicUser(u.getId(), u.getFullName(), u.getAvatarUrl(), u.getCity(), u.getBio(),
                u.getCreatedAt(), listingCount, rating, count);
    }

    public CategoryRef categoryRef(Category c) {
        return new CategoryRef(c.getId(), c.getSlug(), c.getNameAz(), c.getNameEn(), c.getIcon());
    }

    public CategoryDto category(Category c) {
        return new CategoryDto(c.getId(), c.getSlug(), c.getNameAz(), c.getNameEn(), c.getIcon(),
                listings.countByCategoryIdAndStatus(c.getId(), ListingStatus.ACTIVE), c.getSortOrder(), c.isActive());
    }

    public ListingCard card(Listing l) {
        return new ListingCard(l.getId(), l.getTitle(), l.getCity(), l.getDistrict(), l.getDailyPrice(),
                l.getDeposit(), l.coverUrl(), categoryRef(l.getCategory()), l.getRatingAvg(), l.getReviewCount(),
                l.getOwner().getId(), l.getOwner().getFullName(), l.getStatus(), l.getCreatedAt());
    }

    public PhotoDto photo(ListingPhoto p) {
        return new PhotoDto(p.getId(), p.getUrl(), p.getCredit(), p.getCreditUrl());
    }

    public ReviewDto review(Review r) {
        return new ReviewDto(r.getId(), r.getRating(), r.getComment(), r.getCreatedAt(), ref(r.getAuthor()));
    }

    public ListingRef listingRef(Listing l) {
        return new ListingRef(l.getId(), l.getTitle(), l.coverUrl(), l.getCity());
    }

    public BookingDto booking(Booking b) {
        Listing l = b.getListing();
        Long conversationId = conversations.findByListingIdAndRenterId(l.getId(), b.getRenter().getId())
                .map(Conversation::getId).orElse(null);
        return new BookingDto(b.getId(), listingRef(l), ref(b.getRenter()), ref(l.getOwner()), b.getStartDate(),
                b.getEndDate(), b.getDays(), b.getDailyPrice(), b.getRentalTotal(), b.getDeposit(),
                b.getRentalTotal().add(b.getDeposit()), b.getStatus(), b.getMessage(), b.getCreatedAt(),
                reviews.existsByBookingId(b.getId()), conversationId);
    }

    public BlockDto block(AvailabilityBlock a) {
        return new BlockDto(a.getId(), a.getStartDate(), a.getEndDate(), a.getNote());
    }
}
