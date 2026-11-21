package az.kirayla.demo;

import az.kirayla.domain.Listing;
import az.kirayla.repo.ListingRepository;
import az.kirayla.repo.ReviewRepository;
import az.kirayla.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Hourly tidy-up that keeps the public demo usable. Anything older than a day that visitors added to the
 * shared demo data is removed, and seeded bookings return to their original status:
 * <ul>
 *   <li>listings created with the demo renter / demo host accounts, with everything attached to them;</li>
 *   <li>bookings, reviews, conversations and calendar blocks that visitors (any account) put on seeded
 *       listings — most seed hosts cannot log in, so such requests would otherwise hold dates for ever;</li>
 *   <li>bookings, conversations and reports made with the demo accounts anywhere;</li>
 *   <li>new messages in seeded conversations;</li>
 *   <li>expired refresh tokens.</li>
 * </ul>
 * Listings that registered visitors create on their own accounts are not touched.
 */
@Component
public class DemoCleanup {
    private static final Logger log = LoggerFactory.getLogger(DemoCleanup.class);
    static final Duration MAX_AGE = Duration.ofHours(24);
    private static final String PROTECTED = "(SELECT u.id FROM users u WHERE u.demo_protected = TRUE)";

    private final NamedParameterJdbcTemplate jdbc;
    private final ListingRepository listings;
    private final ReviewRepository reviews;
    private final StorageService storage;

    public DemoCleanup(NamedParameterJdbcTemplate jdbc, ListingRepository listings, ReviewRepository reviews,
                       StorageService storage) {
        this.jdbc = jdbc;
        this.listings = listings;
        this.reviews = reviews;
        this.storage = storage;
    }

    @Scheduled(initialDelayString = "${kirayla.demo.cleanup-initial-delay:PT3M}",
            fixedDelayString = "${kirayla.demo.cleanup-interval:PT1H}")
    public void scheduled() {
        try {
            int removed = cleanup(LocalDateTime.now().minus(MAX_AGE));
            log.info("Demo cleanup ran: {} rows removed or restored", removed);
        } catch (RuntimeException e) {
            log.warn("Demo cleanup failed: {}", e.getMessage());
        }
    }

    /** Removes visitor-made demo data created before {@code cutoff}; returns the number of rows touched. */
    @Transactional
    public int cleanup(LocalDateTime cutoff) {
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("seed", SeedData.FIRST_VISITOR_ID)
                .addValue("cutoff", Timestamp.valueOf(cutoff))
                .addValue("now", Timestamp.valueOf(LocalDateTime.now()));

        // 1. listings visitors created with a demo account
        List<Long> doomedListings = jdbc.queryForList("""
                SELECT l.id FROM listings l
                WHERE l.id >= :seed AND l.created_at < :cutoff AND l.owner_id IN %s
                """.formatted(PROTECTED), p, Long.class);
        p.addValue("listings", doomedListings.isEmpty() ? List.of(-1L) : doomedListings);

        // 2. bookings on those listings, visitor bookings on seeded listings, and bookings made with a demo account
        List<Long> doomedBookings = jdbc.queryForList("""
                SELECT b.id FROM bookings b
                WHERE b.listing_id IN (:listings)
                   OR (b.id >= :seed AND b.created_at < :cutoff
                       AND (b.listing_id < :seed OR b.renter_id IN %s))
                """.formatted(PROTECTED), p, Long.class);
        p.addValue("bookings", doomedBookings.isEmpty() ? List.of(-1L) : doomedBookings);

        String doomedReviews = """
                (r.booking_id IN (:bookings) OR r.listing_id IN (:listings)
                 OR (r.id >= :seed AND r.listing_id < :seed AND r.created_at < :cutoff))
                """;
        Set<Long> rated = new LinkedHashSet<>(jdbc.queryForList(
                "SELECT DISTINCT r.listing_id FROM reviews r WHERE " + doomedReviews, p, Long.class));

        int n = 0;
        n += jdbc.update("DELETE FROM reviews r WHERE " + doomedReviews, p);
        n += jdbc.update("DELETE FROM bookings WHERE id IN (:bookings)", p);

        // 3. conversations (messages go with them) and stray new messages in seeded conversations
        n += jdbc.update("""
                DELETE FROM conversations
                WHERE listing_id IN (:listings)
                   OR (id >= :seed AND created_at < :cutoff
                       AND (listing_id < :seed OR renter_id IN %s OR host_id IN %s))
                """.formatted(PROTECTED, PROTECTED), p);
        n += jdbc.update("""
                DELETE FROM messages WHERE id >= :seed AND created_at < :cutoff AND conversation_id < :seed
                """, p);

        // 4. reports and calendar blocks
        n += jdbc.update("""
                DELETE FROM reports
                WHERE listing_id IN (:listings) OR (id >= :seed AND created_at < :cutoff AND reporter_id IN %s)
                """.formatted(PROTECTED), p);
        n += jdbc.update("""
                DELETE FROM availability_blocks WHERE id >= :seed AND created_at < :cutoff AND listing_id < :seed
                """, p);

        // 5. the listings themselves (photos, blocks and wishlist rows cascade) and their uploaded files
        List<String> files = new ArrayList<>(jdbc.queryForList("""
                SELECT ph.storage_key FROM listing_photos ph
                WHERE ph.listing_id IN (:listings) AND ph.storage_key IS NOT NULL
                """, p, String.class));
        n += jdbc.update("DELETE FROM listings WHERE id IN (:listings)", p);

        // 6. seeded bookings go back to the status they were seeded with, unless a fresh visitor booking is in the way
        n += jdbc.update("""
                UPDATE bookings SET status = seed_status, updated_at = :now
                WHERE id < :seed AND seed_status IS NOT NULL AND status <> seed_status AND updated_at < :cutoff
                  AND NOT EXISTS (SELECT 1 FROM bookings o
                                  WHERE o.listing_id = bookings.listing_id AND o.id >= :seed
                                    AND o.status IN ('REQUESTED', 'ACCEPTED')
                                    AND o.start_date <= bookings.end_date AND o.end_date >= bookings.start_date)
                """, p);

        n += jdbc.update("DELETE FROM refresh_tokens WHERE expires_at < :now", p);

        // ratings of listings that lost reviews
        rated.removeAll(doomedListings);
        for (Long id : rated) {
            Listing l = listings.findById(id).orElse(null);
            if (l == null) continue;
            Double avg = reviews.averageForListing(id);
            l.setRatingAvg(BigDecimal.valueOf(avg == null ? 0 : avg).setScale(2, RoundingMode.HALF_UP));
            l.setReviewCount((int) reviews.countByListingId(id));
        }
        files.forEach(storage::delete);
        return n;
    }
}
