package az.kirayla.repo;

import az.kirayla.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Repository-level checks of the inclusive overlap predicate (a.start <= b.end AND b.start <= a.end). */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BookingRepositoryTest {
    private static final Set<BookingStatus> HOLDING = Set.of(BookingStatus.REQUESTED, BookingStatus.ACCEPTED);

    @Autowired UserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired ListingRepository listings;
    @Autowired BookingRepository bookings;
    @Autowired AvailabilityBlockRepository blocks;

    private Listing listing;
    private User renter;
    private final LocalDate d = LocalDate.of(2031, 5, 10);

    @BeforeEach
    void setUp() {
        String u = UUID.randomUUID().toString().substring(0, 8);
        User host = user("host-" + u);
        renter = user("renter-" + u);
        Category c = new Category();
        c.setSlug("repo-" + u);
        c.setNameAz("Test");
        c.setNameEn("Test");
        c.setIcon("box");
        categories.save(c);
        listing = new Listing();
        listing.setOwner(host);
        listing.setCategory(c);
        listing.setTitle("Test item");
        listing.setDescription("Test description long enough");
        listing.setCity("Bakı");
        listing.setDailyPrice(new BigDecimal("20.00"));
        listings.save(listing);
        booking(d, d.plusDays(4), BookingStatus.ACCEPTED);        // 10..14 May
        booking(d.plusDays(10), d.plusDays(12), BookingStatus.DECLINED);
    }

    @Test
    void detectsOverlapsInclusively() {
        assertThat(count(d.plusDays(4), d.plusDays(6))).isEqualTo(1);   // touches last day
        assertThat(count(d.minusDays(3), d)).isEqualTo(1);              // touches first day
        assertThat(count(d.plusDays(1), d.plusDays(2))).isEqualTo(1);   // inside
        assertThat(count(d.minusDays(1), d.plusDays(9))).isEqualTo(1);  // covering
        assertThat(count(d.plusDays(5), d.plusDays(8))).isZero();       // adjacent after
        assertThat(count(d.minusDays(5), d.minusDays(1))).isZero();     // adjacent before
    }

    @Test
    void ignoresNonHoldingStatusesAndExcludedId() {
        assertThat(count(d.plusDays(10), d.plusDays(12))).isZero();     // only a DECLINED booking there
        Booking b = bookings.findOverlapping(listing.getId(), d, d, HOLDING, -1L).get(0);
        assertThat(bookings.countOverlapping(listing.getId(), d, d, HOLDING, b.getId())).isZero();
    }

    @Test
    void blockOverlapQuery() {
        AvailabilityBlock a = new AvailabilityBlock();
        a.setListing(listing);
        a.setStartDate(d.plusDays(20));
        a.setEndDate(d.plusDays(22));
        blocks.save(a);
        assertThat(blocks.countOverlapping(listing.getId(), d.plusDays(22), d.plusDays(25))).isEqualTo(1);
        assertThat(blocks.countOverlapping(listing.getId(), d.plusDays(23), d.plusDays(25))).isZero();
    }

    @Test
    void pessimisticLockQueryLoadsListing() {
        assertThat(listings.findByIdForUpdate(listing.getId())).isPresent();
    }

    private long count(LocalDate from, LocalDate to) {
        return bookings.countOverlapping(listing.getId(), from, to, HOLDING, -1L);
    }

    private User user(String name) {
        User u = new User();
        u.setEmail(name + "@repo.test");
        u.setFullName(name);
        u.setPasswordHash("x");
        return users.save(u);
    }

    private void booking(LocalDate from, LocalDate to, BookingStatus status) {
        Booking b = new Booking();
        b.setListing(listing);
        b.setRenter(renter);
        b.setStartDate(from);
        b.setEndDate(to);
        b.setDays((int) (to.toEpochDay() - from.toEpochDay()) + 1);
        b.setDailyPrice(listing.getDailyPrice());
        b.setRentalTotal(listing.getDailyPrice().multiply(BigDecimal.valueOf(b.getDays())));
        b.setStatus(status);
        bookings.save(b);
    }
}
