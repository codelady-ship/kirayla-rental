package az.kirayla;

import az.kirayla.demo.SeedData;
import az.kirayla.domain.Booking;
import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.Listing;
import az.kirayla.domain.ListingPhoto;
import az.kirayla.domain.ListingStatus;
import az.kirayla.domain.Report;
import az.kirayla.domain.ReportStatus;
import az.kirayla.repo.BookingRepository;
import az.kirayla.repo.ListingPhotoRepository;
import az.kirayla.repo.ListingRepository;
import az.kirayla.repo.ReportRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/listings/highlights on the seed: public, cached, the alternating rule, active listings with a photo
 * only, never what visitors add through the shared demo accounts, "newest" only after an hour and without an
 * open report. Fixtures other than the one-hour check are at least two hours old, so the 61-minute listing of
 * {@link #aVisitorsListingWaitsAnHourBeforeItCanBeANewestCard} is always the newest eligible one.
 */
class HighlightsTest extends IntegrationTestBase {
    private static final Set<BookingStatus> RENTED = Set.of(BookingStatus.ACCEPTED, BookingStatus.COMPLETED);
    private static final PageRequest ALL = PageRequest.of(0, 10_000);

    @Autowired BookingRepository bookings;
    @Autowired ListingRepository listings;
    @Autowired ListingPhotoRepository photos;
    @Autowired ReportRepository reports;

    private List<Long> rentedIds(PageRequest page) {
        return bookings.mostRentedListingIds(RENTED, ListingStatus.ACTIVE, SeedData.FIRST_VISITOR_ID, page);
    }

    private List<Long> newestIds(PageRequest page) {
        return listings.newestHighlightIds(ListingStatus.ACTIVE, LocalDateTime.now().minusHours(1),
                SeedData.FIRST_VISITOR_ID, ReportStatus.OPEN, page);
    }

    private List<Long> highlightIds(int size) throws Exception {
        JsonNode cards = json.readTree(mvc.perform(get("/api/listings/highlights").param("size", String.valueOf(size)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        List<Long> ids = new ArrayList<>();
        cards.forEach(c -> ids.add(c.get("id").asLong()));
        return ids;
    }

    /** An active listing of {@code owner} with one photo, created {@code age} ago. */
    private long listingWithPhoto(Account owner, Duration age) throws Exception {
        long id = createListing(owner, category(), "Hero " + unique("h"), "Bakı", 20);
        Listing l = listings.findById(id).orElseThrow();
        ListingPhoto p = new ListingPhoto();
        p.setListing(l);
        p.setUrl("https://example.test/" + id + ".jpg");
        p.setSortOrder(0);
        photos.save(p);
        setCreatedAt(id, LocalDateTime.now().minus(age));
        return id;
    }

    private void setCreatedAt(long listingId, LocalDateTime at) {
        Listing l = listings.findById(listingId).orElseThrow();
        l.setCreatedAt(at);
        listings.save(l);
    }

    /** One accepted booking on the listing, far enough ahead not to clash with other tests. */
    private void rentOnce(long listingId, Account renter, int daysAhead) throws Exception {
        LocalDate from = LocalDate.now().plusDays(daysAhead);
        Booking b = bookings.findById(bookOk(renter, listingId, from, from.plusDays(1))).orElseThrow();
        b.setStatus(BookingStatus.ACCEPTED);
        bookings.save(b);
    }

    private Account demoHost() throws Exception {
        JsonNode body = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", "rashad@kirayla.az", "password", "Demo1234!"))))
                .andExpect(status().isOk()));
        return new Account(body.at("/user/id").asLong(), "rashad@kirayla.az", body.get("accessToken").asText());
    }

    @Test
    void anonymousVisitorsGetSevenDistinctActiveListingsWithPhotos() throws Exception {
        String body = mvc.perform(get("/api/listings/highlights"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "max-age=60, public"))
                .andReturn().getResponse().getContentAsString();
        JsonNode cards = json.readTree(body);
        assertThat(cards.size()).isEqualTo(7);
        Set<Long> ids = new HashSet<>();
        for (JsonNode c : cards) {
            ids.add(c.get("id").asLong());
            assertThat(c.get("status").asText()).isEqualTo("ACTIVE");
            assertThat(c.get("coverUrl").asText()).isNotBlank();
        }
        assertThat(ids).hasSize(7);
        // no personal data beyond what every listing card already shows
        assertThat(body).doesNotContain("email").doesNotContain("@");
    }

    @Test
    void startsWithTheMostRentedListingThenTheNewest() throws Exception {
        List<Long> rented = rentedIds(PageRequest.of(0, 7));
        List<Long> newest = newestIds(PageRequest.of(0, 7));
        assertThat(rented).isNotEmpty();
        assertThat(newest).hasSizeGreaterThan(1);

        List<Long> cards = highlightIds(4);
        assertThat(cards).hasSize(4);
        assertThat(cards.get(0)).isEqualTo(rented.get(0));
        long second = newest.get(0).equals(rented.get(0)) ? newest.get(1) : newest.get(0);
        assertThat(cards.get(1)).isEqualTo(second);
    }

    @Test
    void sizeIsClamped() throws Exception {
        assertThat(highlightIds(500).size()).isLessThanOrEqualTo(12);
        assertThat(highlightIds(0)).hasSize(1);
    }

    @Test
    void listingsAddedThroughTheDemoAccountsNeverAppearButTheirSeededCatalogueDoes() throws Exception {
        Account host = demoHost();
        long mine = listingWithPhoto(host, Duration.ofHours(5));
        rentOnce(mine, register("Renter"), 300);
        rentOnce(mine, register("Renter"), 303);
        rentOnce(mine, register("Renter"), 306);

        assertThat(newestIds(ALL)).doesNotContain(mine);
        assertThat(rentedIds(ALL)).doesNotContain(mine);
        assertThat(highlightIds(12)).doesNotContain(mine);

        // the same account's seeded listings are the real catalogue and stay eligible
        List<Long> seeded = listings.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(host.id(), ListingStatus.ARCHIVED)
                .stream().map(Listing::getId).filter(SeedData::isSeed).toList();
        assertThat(seeded).isNotEmpty();
        assertThat(newestIds(ALL)).containsAnyElementsOf(seeded);
    }

    @Test
    void aVisitorsListingWaitsAnHourBeforeItCanBeANewestCard() throws Exception {
        long id = listingWithPhoto(register("Fresh Host"), Duration.ofMinutes(30));
        assertThat(newestIds(ALL)).doesNotContain(id);
        assertThat(highlightIds(12)).doesNotContain(id);

        setCreatedAt(id, LocalDateTime.now().minusMinutes(61));
        assertThat(newestIds(ALL).get(0)).isEqualTo(id);
        List<Long> cards = highlightIds(2);
        assertThat(cards.get(1)).isEqualTo(id);
    }

    @Test
    void aListingWithAnOpenReportIsNotANewestCard() throws Exception {
        long id = listingWithPhoto(register("Reported Host"), Duration.ofHours(2));
        assertThat(newestIds(ALL)).contains(id);

        mvc.perform(auth(post("/api/listings/" + id + "/reports"), register("Reporter"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "Şəkil başqa saytdan götürülüb"))))
                .andExpect(status().isCreated());
        assertThat(newestIds(ALL)).doesNotContain(id);
        assertThat(highlightIds(12)).doesNotContain(id);

        // once the admin has dealt with the report the listing is eligible again
        for (Report r : reports.findAll()) {
            if (r.getListing().getId() == id) {
                r.setStatus(ReportStatus.RESOLVED);
                reports.save(r);
            }
        }
        assertThat(newestIds(ALL)).contains(id);
    }

    @Test
    void equallyRentedListingsAreOrderedByCreationDateThenId() throws Exception {
        Account host = register("Tie Host");
        Account renter = register("Tie Renter");
        long olderIdNewerDate = listingWithPhoto(host, Duration.ofHours(3));
        long newerIdOlderDate = listingWithPhoto(host, Duration.ofHours(4));
        LocalDateTime same = LocalDateTime.now().minusHours(6).truncatedTo(ChronoUnit.SECONDS);
        long sameDateLowId = listingWithPhoto(host, Duration.ofHours(6));
        long sameDateHighId = listingWithPhoto(host, Duration.ofHours(6));
        setCreatedAt(sameDateLowId, same);
        setCreatedAt(sameDateHighId, same);
        int day = 320;
        for (long id : List.of(olderIdNewerDate, newerIdOlderDate, sameDateLowId, sameDateHighId)) {
            rentOnce(id, renter, day);
            day += 3;
        }

        List<Long> rented = rentedIds(ALL);
        assertThat(rented.indexOf(olderIdNewerDate)).isNotNegative().isLessThan(rented.indexOf(newerIdOlderDate));
        assertThat(rented.indexOf(sameDateHighId)).isNotNegative().isLessThan(rented.indexOf(sameDateLowId));

        List<Long> newest = newestIds(ALL);
        assertThat(newest.indexOf(olderIdNewerDate)).isNotNegative().isLessThan(newest.indexOf(newerIdOlderDate));
        assertThat(newest.indexOf(sameDateHighId)).isNotNegative().isLessThan(newest.indexOf(sameDateLowId));
    }
}
