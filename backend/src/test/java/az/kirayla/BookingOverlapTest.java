package az.kirayla;

import az.kirayla.domain.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Server-side availability guarantees: overlap detection and race-free booking. */
class BookingOverlapTest extends IntegrationTestBase {
    private Account host;
    private long listing;
    private final LocalDate base = LocalDate.now().plusDays(20);

    @BeforeEach
    void setUp() throws Exception {
        host = register("Host");
        Category c = category();
        listing = createListing(host, c, "PlayStation 5 " + unique("ps"), "Sumqayıt", 30);
    }

    @Test
    void overlappingRequestIsRejectedWith409() throws Exception {
        Account a = register("A");
        Account b = register("B");
        bookOk(a, listing, base, base.plusDays(3));

        book(b, listing, base.plusDays(2), base.plusDays(5))          // tail overlap
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_CONFLICT"));
        book(b, listing, base.minusDays(2), base)                     // shares first day
                .andExpect(status().isConflict());
        book(b, listing, base.plusDays(1), base.plusDays(1))          // inside
                .andExpect(status().isConflict());
        book(b, listing, base.minusDays(1), base.plusDays(4))         // covers
                .andExpect(status().isConflict());
    }

    @Test
    void adjacentRangesAreAllowed() throws Exception {
        Account a = register("A");
        Account b = register("B");
        bookOk(a, listing, base, base.plusDays(2));
        bookOk(b, listing, base.plusDays(3), base.plusDays(4));       // starts the day after
        bookOk(b, listing, base.minusDays(2), base.minusDays(1));     // ends the day before
    }

    @Test
    void declinedOrCancelledBookingsFreeTheDates() throws Exception {
        Account a = register("A");
        Account b = register("B");
        long first = bookOk(a, listing, base, base.plusDays(1));
        mvc.perform(auth(post("/api/bookings/" + first + "/decline"), host)).andExpect(status().isOk());
        bookOk(b, listing, base, base.plusDays(1));
    }

    @Test
    void hostBlockOverlapIsRejected() throws Exception {
        mvc.perform(auth(post("/api/listings/" + listing + "/blocks"), host).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("from", base.toString(), "to", base.plusDays(2).toString(),
                                "note", "Təmir"))))
                .andExpect(status().isCreated());
        Account a = register("A");
        book(a, listing, base.plusDays(2), base.plusDays(4))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_CONFLICT"));
        bookOk(a, listing, base.plusDays(3), base.plusDays(4));
    }

    @Test
    void blockOverAcceptedBookingIsRejected() throws Exception {
        Account a = register("A");
        long id = bookOk(a, listing, base, base.plusDays(1));
        mvc.perform(auth(post("/api/bookings/" + id + "/accept"), host)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/listings/" + listing + "/blocks"), host).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("from", base.plusDays(1).toString(), "to", base.plusDays(3).toString()))))
                .andExpect(status().isConflict());
    }

    @Test
    void concurrentBookingsForTheSameDatesOnlyOneWins() throws Exception {
        int threads = 4;
        List<Account> renters = new ArrayList<>();
        for (int i = 0; i < threads; i++) renters.add(register("R" + i));

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (Account r : renters) {
            results.add(pool.submit(() -> {
                start.await();
                return book(r, listing, base.plusDays(40), base.plusDays(42)).andReturn().getResponse().getStatus();
            }));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : results) statuses.add(f.get(60, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(statuses).filteredOn(s -> s == 409).hasSize(threads - 1);
    }
}
