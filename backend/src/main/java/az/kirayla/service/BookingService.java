package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.domain.*;
import az.kirayla.repo.*;
import az.kirayla.security.AuthUser;
import az.kirayla.security.CurrentUser;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/**
 * Booking lifecycle: REQUESTED → ACCEPTED | DECLINED | CANCELLED, ACCEPTED → COMPLETED | CANCELLED.
 *
 * <p>Availability is enforced server-side: every create/accept runs in one transaction that first
 * takes a row lock on the listing ({@code SELECT ... FOR UPDATE}), then checks for overlapping
 * bookings and host blocks. Two concurrent requests for the same listing are therefore serialized and
 * the second one sees the first one's booking, so double-booking is impossible.
 */
@Service
public class BookingService {
    static final Set<BookingStatus> HOLDING = Set.of(BookingStatus.REQUESTED, BookingStatus.ACCEPTED);

    private final BookingRepository bookings;
    private final ListingRepository listings;
    private final AvailabilityBlockRepository blocks;
    private final UserRepository users;
    private final ReviewRepository reviews;
    private final ConversationService conversations;
    private final Mapper mapper;

    public BookingService(BookingRepository bookings, ListingRepository listings, AvailabilityBlockRepository blocks,
                          UserRepository users, ReviewRepository reviews, ConversationService conversations,
                          Mapper mapper) {
        this.bookings = bookings;
        this.listings = listings;
        this.blocks = blocks;
        this.users = users;
        this.reviews = reviews;
        this.conversations = conversations;
        this.mapper = mapper;
    }

    @Transactional
    public BookingDto create(BookingRequest req) {
        AuthUser me = CurrentUser.require();
        LocalDate today = LocalDate.now();
        if (req.startDate().isBefore(today)) throw ApiException.validation("Start date cannot be in the past");
        if (req.endDate().isBefore(req.startDate())) throw ApiException.validation("End date must not be before start date");

        Listing l = listings.findByIdForUpdate(req.listingId()).orElseThrow(() -> ApiException.notFound("Listing"));
        if (l.getStatus() != ListingStatus.ACTIVE) throw ApiException.notFound("Listing");
        if (l.getOwner().getId().equals(me.id())) throw ApiException.forbidden("You cannot book your own listing");

        int days = (int) ChronoUnit.DAYS.between(req.startDate(), req.endDate()) + 1;
        if (days < l.getMinDays() || days > l.getMaxDays()) {
            throw ApiException.validation("This item can be rented for " + l.getMinDays() + "–" + l.getMaxDays() + " days");
        }
        assertFree(l.getId(), req.startDate(), req.endDate(), HOLDING, -1L);

        Booking b = new Booking();
        b.setListing(l);
        b.setRenter(users.getReferenceById(me.id()));
        b.setStartDate(req.startDate());
        b.setEndDate(req.endDate());
        b.setDays(days);
        b.setDailyPrice(l.getDailyPrice());
        b.setRentalTotal(l.getDailyPrice().multiply(BigDecimal.valueOf(days)));
        b.setDeposit(l.getDeposit());
        String msg = AuthService.blankToNull(req.message());
        b.setMessage(msg);
        bookings.saveAndFlush(b);
        if (msg != null) conversations.append(l, me.id(), me.id(), msg);
        return mapper.booking(bookings.findById(b.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public List<BookingDto> mine() {
        return bookings.findByRenterIdOrderByCreatedAtDesc(CurrentUser.id()).stream().map(mapper::booking).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDto> incoming(BookingStatus status) {
        Long me = CurrentUser.id();
        List<Booking> list = status == null
                ? bookings.findByListingOwnerIdOrderByCreatedAtDesc(me)
                : bookings.findByListingOwnerIdAndStatusOrderByCreatedAtDesc(me, status);
        return list.stream().map(mapper::booking).toList();
    }

    @Transactional(readOnly = true)
    public BookingDto get(Long id) {
        Booking b = find(id);
        AuthUser me = CurrentUser.require();
        boolean allowed = me.isAdmin() || isRenter(b, me.id()) || isHost(b, me.id());
        if (!allowed) throw ApiException.notFound("Booking");
        return mapper.booking(b);
    }

    @Transactional
    public BookingDto accept(Long id) {
        Booking b = lockAndFind(id);
        requireHost(b);
        requireState(b, BookingStatus.REQUESTED);
        assertFree(b.getListing().getId(), b.getStartDate(), b.getEndDate(), Set.of(BookingStatus.ACCEPTED), b.getId());
        b.setStatus(BookingStatus.ACCEPTED);
        // competing requests for the same days can no longer be honoured
        bookings.findOverlapping(b.getListing().getId(), b.getStartDate(), b.getEndDate(),
                        Set.of(BookingStatus.REQUESTED), b.getId())
                .forEach(other -> other.setStatus(BookingStatus.DECLINED));
        return mapper.booking(b);
    }

    @Transactional
    public BookingDto decline(Long id) {
        Booking b = lockAndFind(id);
        requireHost(b);
        requireState(b, BookingStatus.REQUESTED);
        b.setStatus(BookingStatus.DECLINED);
        return mapper.booking(b);
    }

    @Transactional
    public BookingDto cancel(Long id) {
        Booking b = lockAndFind(id);
        Long me = CurrentUser.id();
        if (isRenter(b, me)) {
            boolean ok = b.getStatus() == BookingStatus.REQUESTED
                    || (b.getStatus() == BookingStatus.ACCEPTED && LocalDate.now().isBefore(b.getStartDate()));
            if (!ok) throw ApiException.invalidState("This booking can no longer be cancelled");
        } else if (isHost(b, me)) {
            requireState(b, BookingStatus.ACCEPTED);
        } else {
            throw ApiException.notFound("Booking");
        }
        b.setStatus(BookingStatus.CANCELLED);
        return mapper.booking(b);
    }

    @Transactional
    public BookingDto complete(Long id) {
        Booking b = lockAndFind(id);
        requireHost(b);
        requireState(b, BookingStatus.ACCEPTED);
        if (LocalDate.now().isBefore(b.getStartDate())) {
            throw ApiException.invalidState("A rental can be completed only after it has started");
        }
        b.setStatus(BookingStatus.COMPLETED);
        return mapper.booking(b);
    }

    @Transactional
    public ReviewDto review(Long id, ReviewRequest req) {
        Booking b = lockAndFind(id);
        if (!isRenter(b, CurrentUser.id())) throw ApiException.forbidden("Only the renter can review this booking");
        requireState(b, BookingStatus.COMPLETED);
        if (reviews.existsByBookingId(b.getId())) throw ApiException.invalidState("This booking has already been reviewed");
        Review r = new Review();
        r.setBooking(b);
        r.setListing(b.getListing());
        r.setAuthor(b.getRenter());
        r.setRating(req.rating());
        r.setComment(req.comment().trim());
        reviews.saveAndFlush(r);

        Listing l = b.getListing();
        Double avg = reviews.averageForListing(l.getId());
        l.setRatingAvg(BigDecimal.valueOf(avg == null ? 0 : avg).setScale(2, RoundingMode.HALF_UP));
        l.setReviewCount((int) reviews.countByListingId(l.getId()));
        return mapper.review(r);
    }

    /** Throws 409 BOOKING_CONFLICT when [from, to] overlaps a booking in {@code statuses} or a host block. */
    void assertFree(Long listingId, LocalDate from, LocalDate to, Set<BookingStatus> statuses, Long excludeId) {
        if (bookings.countOverlapping(listingId, from, to, statuses, excludeId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_CONFLICT", "These dates are already booked");
        }
        if (blocks.countOverlapping(listingId, from, to) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "BOOKING_CONFLICT", "The owner has blocked some of these dates");
        }
    }

    /**
     * Takes the listing's row lock (the same one {@link #create} uses) BEFORE loading the booking, so the
     * status that is checked is the committed one: of two concurrent transitions on a booking only one wins,
     * the other sees the new status and answers 409 INVALID_STATE.
     */
    private Booking lockAndFind(Long id) {
        Long listingId = bookings.findListingId(id).orElseThrow(() -> ApiException.notFound("Booking"));
        listings.findByIdForUpdate(listingId);
        return find(id);
    }

    private Booking find(Long id) {
        return bookings.findById(id).orElseThrow(() -> ApiException.notFound("Booking"));
    }

    private static boolean isRenter(Booking b, Long userId) { return b.getRenter().getId().equals(userId); }

    private static boolean isHost(Booking b, Long userId) { return b.getListing().getOwner().getId().equals(userId); }

    private static void requireHost(Booking b) {
        if (!isHost(b, CurrentUser.id())) throw ApiException.forbidden("Only the owner of the item can do this");
    }

    private static void requireState(Booking b, BookingStatus expected) {
        if (b.getStatus() != expected) {
            throw ApiException.invalidState("Booking is " + b.getStatus() + ", expected " + expected);
        }
    }
}
