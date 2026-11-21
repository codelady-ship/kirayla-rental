package az.kirayla;

import az.kirayla.domain.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BookingLifecycleTest extends IntegrationTestBase {
    private Account host;
    private Account renter;
    private long listing;

    @BeforeEach
    void setUp() throws Exception {
        host = register("Rəşad");
        renter = register("Aysel");
        Category c = category();
        listing = createListing(host, c, "Dron DJI Mini " + unique("x"), "Bakı", 40);
    }

    @Test
    void requestAcceptCompleteReview() throws Exception {
        LocalDate today = LocalDate.now();
        mvc.perform(auth(post("/api/bookings"), renter).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("listingId", listing, "startDate", today.toString(),
                                "endDate", today.plusDays(2).toString(), "message", "Salam, şənbə götürə bilərəm?"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.days").value(3))
                .andExpect(jsonPath("$.rentalTotal").value(120.0))
                .andExpect(jsonPath("$.deposit").value(50.0))
                .andExpect(jsonPath("$.totalDue").value(170.0))
                .andExpect(jsonPath("$.conversationId").isNumber());

        long id = read(mvc.perform(auth(get("/api/bookings/incoming").param("status", "REQUESTED"), host)))
                .get(0).get("id").asLong();

        // the renter cannot accept their own request
        mvc.perform(auth(post("/api/bookings/" + id + "/accept"), renter)).andExpect(status().isForbidden());
        mvc.perform(auth(post("/api/bookings/" + id + "/accept"), host))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));
        mvc.perform(auth(post("/api/bookings/" + id + "/accept"), host))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_STATE"));

        // review not allowed before completion
        String review = json.writeValueAsString(Map.of("rating", 5, "comment", "Əla vəziyyətdə idi, təşəkkürlər!"));
        mvc.perform(auth(post("/api/bookings/" + id + "/review"), renter).contentType(MediaType.APPLICATION_JSON).content(review))
                .andExpect(status().isConflict());

        mvc.perform(auth(post("/api/bookings/" + id + "/complete"), host))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
        mvc.perform(auth(post("/api/bookings/" + id + "/review"), renter).contentType(MediaType.APPLICATION_JSON).content(review))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.rating").value(5));
        mvc.perform(auth(post("/api/bookings/" + id + "/review"), renter).contentType(MediaType.APPLICATION_JSON).content(review))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/listings/" + listing))
                .andExpect(jsonPath("$.ratingAvg").value(5.0))
                .andExpect(jsonPath("$.reviewCount").value(1))
                .andExpect(jsonPath("$.reviews[0].author.id").value(renter.id()));
        mvc.perform(auth(get("/api/bookings/mine"), renter))
                .andExpect(jsonPath("$[0].reviewed").value(true));
        mvc.perform(auth(get("/api/host/earnings"), host))
                .andExpect(jsonPath("$.totalEarned").value(120.0))
                .andExpect(jsonPath("$.completedCount").value(1))
                .andExpect(jsonPath("$.monthly", hasSize(12)))
                .andExpect(jsonPath("$.topListings[0].id").value(listing));

        // the message became a conversation visible to both sides
        mvc.perform(auth(get("/api/conversations/unread-count"), host)).andExpect(jsonPath("$.count").value(1));
        long conv = read(mvc.perform(auth(get("/api/conversations"), host))).get(0).get("id").asLong();
        mvc.perform(auth(get("/api/conversations/" + conv + "/messages"), host))
                .andExpect(jsonPath("$[0].mine").value(false));
        mvc.perform(auth(post("/api/conversations/" + conv + "/messages"), host).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("body", "Bəli, gözləyirəm."))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.mine").value(true));
        mvc.perform(auth(get("/api/conversations/unread-count"), host)).andExpect(jsonPath("$.count").value(0));
        Account stranger = register("Stranger");
        mvc.perform(auth(get("/api/conversations/" + conv + "/messages"), stranger)).andExpect(status().isNotFound());
    }

    @Test
    void declineAndCancelRules() throws Exception {
        LocalDate from = LocalDate.now().plusDays(5);
        long a = bookOk(renter, listing, from, from.plusDays(1));
        mvc.perform(auth(post("/api/bookings/" + a + "/decline"), host))
                .andExpect(jsonPath("$.status").value("DECLINED"));
        mvc.perform(auth(post("/api/bookings/" + a + "/cancel"), renter))
                .andExpect(status().isConflict());

        long b = bookOk(renter, listing, from, from.plusDays(1));
        mvc.perform(auth(post("/api/bookings/" + b + "/complete"), host)).andExpect(status().isConflict());
        mvc.perform(auth(post("/api/bookings/" + b + "/cancel"), renter))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void validationRules() throws Exception {
        LocalDate today = LocalDate.now();
        book(host, listing, today.plusDays(1), today.plusDays(2))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        book(renter, listing, today.minusDays(1), today.plusDays(1))
                .andExpect(status().isBadRequest());
        book(renter, listing, today.plusDays(3), today.plusDays(1))
                .andExpect(status().isBadRequest());
        book(renter, listing, today.plusDays(1), today.plusDays(30)) // maxDays = 14
                .andExpect(status().isBadRequest());
    }

    @Test
    void acceptingDeclinesCompetingRequests() throws Exception {
        // a second renter cannot even request overlapping dates while one request is pending,
        // so competing requests only exist for adjacent-but-overlapping windows created before a block;
        // here we verify accept re-checks accepted bookings and blocks.
        LocalDate from = LocalDate.now().plusDays(8);
        long id = bookOk(renter, listing, from, from.plusDays(2));
        mvc.perform(auth(post("/api/listings/" + listing + "/blocks"), host).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("from", from.plusDays(1).toString(), "to", from.plusDays(1).toString()))))
                .andExpect(status().isCreated());
        mvc.perform(auth(post("/api/bookings/" + id + "/accept"), host))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BOOKING_CONFLICT"));
    }
}
