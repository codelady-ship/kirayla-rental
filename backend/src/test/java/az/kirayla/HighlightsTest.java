package az.kirayla;

import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.ListingStatus;
import az.kirayla.repo.BookingRepository;
import az.kirayla.repo.ListingRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/listings/highlights on the seed: public, cached, the alternating rule, active listings with a photo only. */
class HighlightsTest extends IntegrationTestBase {
    @Autowired BookingRepository bookings;
    @Autowired ListingRepository listings;

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
        List<Long> rented = bookings.mostRentedListingIds(Set.of(BookingStatus.ACCEPTED, BookingStatus.COMPLETED),
                ListingStatus.ACTIVE, PageRequest.of(0, 7));
        List<Long> newest = listings.newestWithPhotoIds(ListingStatus.ACTIVE, PageRequest.of(0, 7));
        assertThat(rented).isNotEmpty();
        assertThat(newest).isNotEmpty();

        JsonNode cards = json.readTree(mvc.perform(get("/api/listings/highlights").param("size", "4"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(cards.size()).isEqualTo(4);
        assertThat(cards.get(0).get("id").asLong()).isEqualTo(rented.get(0));
        long second = newest.get(0).equals(rented.get(0)) ? newest.get(1) : newest.get(0);
        assertThat(cards.get(1).get("id").asLong()).isEqualTo(second);
    }

    @Test
    void sizeIsClamped() throws Exception {
        JsonNode many = json.readTree(mvc.perform(get("/api/listings/highlights").param("size", "500"))
                .andReturn().getResponse().getContentAsString());
        assertThat(many.size()).isLessThanOrEqualTo(12);
        JsonNode one = json.readTree(mvc.perform(get("/api/listings/highlights").param("size", "0"))
                .andReturn().getResponse().getContentAsString());
        assertThat(one.size()).isEqualTo(1);
    }
}
