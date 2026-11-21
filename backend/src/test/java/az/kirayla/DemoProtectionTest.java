package az.kirayla;

import az.kirayla.demo.DemoCleanup;
import az.kirayla.domain.Role;
import az.kirayla.storage.StorageService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Timestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The public demo accounts against the real seed: what the read-only admin may read, what the demo renter
 * and host may change, that other seed users cannot sign in, and that the cleanup puts things back.
 */
class DemoProtectionTest extends IntegrationTestBase {
    private static final String DEMO_PASSWORD = "Demo1234!";
    private static final List<String> SEED_LOGINS = List.of("aysel@kirayla.az", "rashad@kirayla.az", "demo-admin@kirayla.az");
    @Autowired DemoCleanup cleanup;
    @Autowired JdbcTemplate sql;
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager transactions;
    @Autowired StorageService storage;

    private Account demo(String email) throws Exception {
        JsonNode body = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", DEMO_PASSWORD))))
                .andExpect(status().isOk()));
        return new Account(body.at("/user/id").asLong(), email, body.get("accessToken").asText());
    }

    /** A listing of the demo host that came with the seed (ids below 10000), never one a test created. */
    private JsonNode seededListingOf(Account host) throws Exception {
        for (JsonNode l : read(mvc.perform(auth(get("/api/host/listings"), host)))) if (l.get("id").asLong() < 10_000) return l;
        throw new AssertionError("no seeded listing");
    }

    private String body(org.springframework.test.web.servlet.ResultActions r) throws Exception {
        return r.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    // ---------------------------------------------------------------- 1. demo admin reads

    @Test
    void demoAdminNeverSeesVisitorsPersonalData() throws Exception {
        Account host = register("Hostess");
        Account visitor = register("Visitor");
        long listing = createListing(host, category(), "Kanoe " + unique("k"), "Bakı", 25);
        String secret = "Zəng et: +994 50 555 01 " + unique("x");
        LocalDate from = LocalDate.now().plusDays(40);
        long booking = read(mvc.perform(auth(post("/api/bookings"), visitor).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("listingId", listing, "startDate", from.toString(),
                                "endDate", from.plusDays(1).toString(), "message", secret))))
                .andExpect(status().isCreated())).get("id").asLong();
        String reason = "Sahibi mənə " + visitor.email() + " ünvanından yazdı " + unique("r");
        mvc.perform(auth(post("/api/listings/" + listing + "/reports"), visitor).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("reason", reason)))).andExpect(status().isCreated());

        Account admin = demo("demo-admin@kirayla.az");
        String local = visitor.email().substring(0, visitor.email().indexOf('@'));

        // users: e-mails masked, and the masked field cannot be probed through ?q=
        String usersJson = body(mvc.perform(auth(get("/api/admin/users").param("size", "100"), admin)));
        assertThat(usersJson).doesNotContain(visitor.email()).doesNotContain(host.email()).doesNotContain(local);
        assertThat(usersJson).contains(local.charAt(0) + "***@test.kirayla.az");
        assertThat(usersJson).contains("\"name\":\"Visitor\"");
        mvc.perform(auth(get("/api/admin/users").param("q", local), admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(auth(get("/api/admin/users").param("q", "test.kirayla.az"), admin))
                .andExpect(jsonPath("$.totalElements").value(0));
        // its own profile is masked too
        mvc.perform(auth(get("/api/auth/me"), admin)).andExpect(jsonPath("$.email").value("d***@kirayla.az"));

        // bookings: the renter's private note to the host is gone, list and single item
        String bookingsJson = body(mvc.perform(auth(get("/api/admin/bookings").param("size", "100"), admin)));
        assertThat(bookingsJson).doesNotContain(secret).doesNotContain("+994 50 555");
        mvc.perform(auth(get("/api/bookings/" + booking), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(booking))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.nullValue()));

        // reports: what a visitor wrote to the moderators is hidden; the seeded examples stay readable
        String reportsJson = body(mvc.perform(auth(get("/api/admin/reports"), admin)));
        assertThat(reportsJson).doesNotContain(reason).doesNotContain(visitor.email());
        assertThat(reportsJson).contains("Şəkillər başqa məhsula aid görünür.");

        // the demo admin has no way into other people's message threads
        mvc.perform(auth(get("/api/conversations"), admin)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(auth(get("/api/conversations/1/messages"), admin)).andExpect(status().is4xxClientError());

        // a real admin still sees everything
        Account real = registerWith("Real Admin", Role.ADMIN, false);
        assertThat(body(mvc.perform(auth(get("/api/admin/users").param("q", local), real)))).contains(visitor.email());
        mvc.perform(auth(get("/api/bookings/" + booking), real)).andExpect(jsonPath("$.message").value(secret));
    }

    @Test
    void redactionIsDenyByDefault() throws Exception {
        JsonNode tree = json.readTree("""
                {"id": 10001, "name": "Aynur", "email": "aynur.q@example.org", "phone": "+994501112233",
                 "message": "evdə olacam", "bio": "yaz: aynur.q@example.org",
                 "nested": {"id": 3, "reason": "seed text", "somethingNew": "x"},
                 "tags": ["a", "b"], "count": 4, "ok": true}
                """);
        var m = az.kirayla.demo.DemoAdminRedaction.class.getDeclaredMethod("redact", JsonNode.class);
        m.setAccessible(true);
        m.invoke(null, tree);
        assertThat(tree.get("name").asText()).isEqualTo("Aynur");
        assertThat(tree.get("email").asText()).isEqualTo("a***@example.org");
        assertThat(tree.get("phone").isNull()).as("unknown text field").isTrue();
        assertThat(tree.get("message").isNull()).as("visitor free text").isTrue();
        assertThat(tree.get("bio").asText()).isEqualTo("yaz: a***@example.org");
        assertThat(tree.at("/nested/reason").asText()).isEqualTo("seed text");
        assertThat(tree.at("/nested/somethingNew").isNull()).isTrue();
        assertThat(tree.get("tags").get(0).isNull()).isTrue();
        assertThat(tree.get("count").asInt()).isEqualTo(4);
        assertThat(tree.get("ok").asBoolean()).isTrue();
    }

    // ---------------------------------------------------------------- 2. seed users and the demo guard

    @Test
    void onlyTheThreeDemoAccountsCanSignIn() throws Exception {
        for (String email : List.of("leyla@kirayla.az", "kamran@kirayla.az", "fidan@kirayla.az", "tural@kirayla.az",
                "nigar@kirayla.az", "elvin@kirayla.az", "gunel@kirayla.az", "sebine@kirayla.az", "orxan@kirayla.az")) {
            for (String password : List.of(DEMO_PASSWORD, "!no-login")) {
                mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                        .andExpect(status().isUnauthorized())
                        .andExpect(jsonPath("$.code").value("BAD_CREDENTIALS"));
            }
        }
        demo("aysel@kirayla.az");
        demo("rashad@kirayla.az");
        demo("demo-admin@kirayla.az");
    }

    @Test
    void demoHostAndRenterCannotChangeSeedDataButCanPlayWithTheirOwn() throws Exception {
        Account host = demo("rashad@kirayla.az");
        Account renter = demo("aysel@kirayla.az");
        JsonNode seeded = seededListingOf(host);
        long seededId = seeded.get("id").asLong();
        assertThat(seededId).isLessThan(10_000);
        String edit = json.writeValueAsString(Map.of("title", "Wrecked by a visitor", "description",
                "This text should never reach the shared demo catalogue.", "categoryId", 1, "city", "Bakı",
                "dailyPrice", 1, "deposit", 0, "condition", "FAIR", "minDays", 1, "maxDays", 2));

        mvc.perform(auth(delete("/api/listings/" + seededId), host))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("DEMO_PROTECTED"));
        mvc.perform(auth(put("/api/listings/" + seededId), host).contentType(MediaType.APPLICATION_JSON).content(edit))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("DEMO_PROTECTED"));
        long photoId = read(mvc.perform(get("/api/listings/" + seededId))).at("/photos/0/id").asLong();
        mvc.perform(auth(delete("/api/listings/" + seededId + "/photos/" + photoId), host))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("DEMO_PROTECTED"));
        for (Account a : List.of(host, renter)) {
            mvc.perform(auth(put("/api/users/me"), a).contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(Map.of("name", "Changed Name", "bio", "changed"))))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("DEMO_PROTECTED"));
        }
        mvc.perform(get("/api/listings/" + seededId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.title").value(seeded.get("title").asText()))
                .andExpect(jsonPath("$.photos[0].id").value(photoId));
        mvc.perform(auth(get("/api/auth/me"), host)).andExpect(jsonPath("$.name").value("Rəşad Həsənov"));

        // their own new listing is theirs to edit and archive
        long own = createListing(host, category(), "Demo sınaq elanı " + unique("d"), "Bakı", 9);
        assertThat(own).isGreaterThanOrEqualTo(10_000);
        mvc.perform(auth(put("/api/listings/" + own), host).contentType(MediaType.APPLICATION_JSON)
                        .content(edit.replace("Wrecked by a visitor", "Edited by a visitor").replace("\"categoryId\":1",
                                "\"categoryId\":" + read(mvc.perform(get("/api/listings/" + own))).at("/category/id").asLong())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Edited by a visitor"));
        mvc.perform(auth(delete("/api/listings/" + own), host)).andExpect(status().isNoContent());

        // a normal registered user is not affected by the guard
        Account user = register("Owner");
        long theirs = createListing(user, category(), "Öz elanım " + unique("o"), "Gəncə", 12);
        mvc.perform(auth(put("/api/users/me"), user).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", "Owner Renamed")))).andExpect(status().isOk());
        mvc.perform(auth(delete("/api/listings/" + theirs), user)).andExpect(status().isNoContent());
    }

    @Test
    void cleanupRemovesVisitorDataOnDemoAccountsAndRestoresSeededBookings() throws Exception {
        Account host = demo("rashad@kirayla.az");
        Account renter = demo("aysel@kirayla.az");
        Account visitor = register("Passerby");
        Account owner = register("Keeper");

        long demoListing = createListing(host, category(), "Qonaq elanı " + unique("q"), "Bakı", 14);
        long keptListing = createListing(owner, category(), "Qalan elan " + unique("s"), "Bakı", 14);
        LocalDate far = LocalDate.now().plusDays(300);
        long seededListing = seededListingOf(host).get("id").asLong();
        long onSeeded = bookOk(visitor, seededListing, far, far.plusDays(1));           // visitor request on a seeded listing
        long onDemoListing = bookOk(visitor, demoListing, far, far.plusDays(1));        // on the visitor-made demo listing
        long byDemoRenter = bookOk(renter, keptListing, far, far.plusDays(1));          // made with the demo renter
        long keptBooking = bookOk(visitor, keptListing, far.plusDays(5), far.plusDays(6)); // ordinary users, ordinary listing

        // the demo host answers a seeded request
        JsonNode pending = read(mvc.perform(auth(get("/api/bookings/incoming").param("status", "REQUESTED"), host)));
        long seededBooking = -1;
        for (JsonNode b : pending) if (b.get("id").asLong() < 10_000) seededBooking = b.get("id").asLong();
        assertThat(seededBooking).as("a seeded pending request of the demo host").isPositive();
        mvc.perform(auth(post("/api/bookings/" + seededBooking + "/decline"), host))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DECLINED"));

        // nothing is old enough yet
        cleanup.cleanup(LocalDateTime.now().minusHours(24));
        mvc.perform(get("/api/listings/" + demoListing)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/bookings/" + seededBooking), host)).andExpect(jsonPath("$.status").value("DECLINED"));

        // …a day later
        cleanup.cleanup(LocalDateTime.now().plusMinutes(1));
        mvc.perform(get("/api/listings/" + demoListing)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/bookings/" + onSeeded), visitor)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/bookings/" + onDemoListing), visitor)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/bookings/" + byDemoRenter), renter)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/bookings/" + seededBooking), host)).andExpect(jsonPath("$.status").value("REQUESTED"));
        // seed and ordinary users' data are untouched
        mvc.perform(get("/api/listings/" + seededListing)).andExpect(status().isOk());
        mvc.perform(get("/api/listings/" + keptListing)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/bookings/" + keptBooking), visitor)).andExpect(status().isOk());
        mvc.perform(get("/api/listings").param("size", "1")).andExpect(jsonPath("$.totalElements").value(
                org.hamcrest.Matchers.greaterThanOrEqualTo(40)));
    }

    /**
     * The path the scheduler really takes: {@code scheduled()} called on the bean, rows aged in the database.
     * A visitor's 1-star review through the demo renter must leave no trace on the seeded listing's rating,
     * and a run that fails part-way must change nothing at all.
     */
    @Test
    void scheduledRunRestoresSeededRatingsAndIsAtomic() throws Exception {
        Account renter = demo("aysel@kirayla.az");
        Map<String, Object> target = sql.queryForList("""
                SELECT b.id AS booking, b.listing_id AS listing FROM bookings b JOIN listings l ON l.id = b.listing_id
                WHERE b.renter_id = ? AND b.status = 'COMPLETED' AND b.id < 10000 AND l.id < 10000 AND l.review_count > 0
                  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id)
                ORDER BY b.id
                """, renter.id()).get(0);
        long booking = ((Number) target.get("booking")).longValue();
        long listing = ((Number) target.get("listing")).longValue();
        BigDecimal seededRating = sql.queryForObject("SELECT rating_avg FROM listings WHERE id = ?", BigDecimal.class, listing);
        int seededCount = sql.queryForObject("SELECT review_count FROM listings WHERE id = ?", Integer.class, listing);
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM reviews WHERE listing_id = ?", Integer.class, listing))
                .as("seeded count matches the seeded reviews").isEqualTo(seededCount);

        mvc.perform(auth(post("/api/bookings/" + booking + "/review"), renter).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("rating", 1, "comment", "Bir ulduz, sadəcə sınaq üçün."))))
                .andExpect(status().is2xxSuccessful());
        BigDecimal skewed = sql.queryForObject("SELECT rating_avg FROM listings WHERE id = ?", BigDecimal.class, listing);
        assertThat(skewed).isLessThan(seededRating);
        mvc.perform(get("/api/listings/" + listing)).andExpect(jsonPath("$.reviewCount").value(seededCount + 1));

        // fresh rows survive a scheduled run
        cleanup.scheduled();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM reviews WHERE booking_id = ?", Integer.class, booking)).isEqualTo(1);

        // two days later…
        sql.update("UPDATE reviews SET created_at = ? WHERE booking_id = ?",
                Timestamp.valueOf(LocalDateTime.now().minusDays(2)), booking);

        // …a run that breaks at its last statement rolls back completely: review, rating and count are as before it
        DemoCleanup failing = new DemoCleanup(new NamedParameterJdbcTemplate(dataSource) {
            @Override
            public int update(String statement, SqlParameterSource params) {
                if (statement.contains("refresh_tokens")) throw new IllegalStateException("simulated failure mid-run");
                return super.update(statement, params);
            }
        }, transactions, storage);
        failing.scheduled();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM reviews WHERE booking_id = ?", Integer.class, booking))
                .as("the delete was rolled back").isEqualTo(1);
        assertThat(sql.queryForObject("SELECT review_count FROM listings WHERE id = ?", Integer.class, listing)).isEqualTo(seededCount + 1);
        assertThat(sql.queryForObject("SELECT rating_avg FROM listings WHERE id = ?", BigDecimal.class, listing)).isEqualByComparingTo(skewed);

        // …and the real scheduled run removes the review and puts rating and count back to the seeded values
        cleanup.scheduled();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM reviews WHERE booking_id = ?", Integer.class, booking)).isZero();
        assertThat(sql.queryForObject("SELECT rating_avg FROM listings WHERE id = ?", BigDecimal.class, listing)).isEqualByComparingTo(seededRating);
        assertThat(sql.queryForObject("SELECT review_count FROM listings WHERE id = ?", Integer.class, listing)).isEqualTo(seededCount);
        mvc.perform(get("/api/listings/" + listing))
                .andExpect(jsonPath("$.reviewCount").value(seededCount))
                .andExpect(jsonPath("$.ratingAvg").value(seededRating.doubleValue()));
    }

    // ---------------------------------------------------------------- tokens, rate limit, races

    @Test
    void refreshTokensRotateAndLogoutRevokes() throws Exception {
        Account a = register("Rotator");
        JsonNode login = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", a.email(), "password", "Secret123!")))));
        String first = login.get("refreshToken").asText();

        JsonNode second = read(mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("refreshToken", first)))).andExpect(status().isOk()));
        assertThat(second.get("refreshToken").asText()).isNotEqualTo(first);
        // a spent token is refused
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("refreshToken", first)))).andExpect(status().isUnauthorized());

        // logout revokes the current one; logging out twice is harmless
        String current = second.get("refreshToken").asText();
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("refreshToken", current)))).andExpect(status().isNoContent());
        }
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("refreshToken", current)))).andExpect(status().isUnauthorized());
        // an access token is not a refresh token
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("refreshToken", a.token())))).andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedWrongPasswordsAreRateLimitedPerAddressAndEmail() throws Exception {
        Account victim = register("Victim");
        Account other = register("Bystander");
        String wrong = json.writeValueAsString(Map.of("email", victim.email(), "password", "not-the-password"));
        for (int i = 0; i < 8; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
        // even the right password has to wait now…
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", victim.email(), "password", "Secret123!"))))
                .andExpect(status().isTooManyRequests());
        // …a forged X-Forwarded-For does not buy a fresh allowance…
        mvc.perform(post("/api/auth/login").header("X-Forwarded-For", "203.0.113.77").contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(status().isTooManyRequests());
        // …and other accounts from the same address are not locked out
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", other.email(), "password", "Secret123!"))))
                .andExpect(status().isOk());
        // a different client address is counted separately
        mvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr("198.51.100.9"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", victim.email(), "password", "Secret123!"))))
                .andExpect(status().isOk());
    }

    private int loginFrom(String address, String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr(address); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void publicDemoAccountsAreNotLockedPerEmailButStillPerAddress() throws Exception {
        String shared = "198.51.100.40";   // e.g. a proxy hop many visitors arrive through
        // one visitor's wrong passwords do not lock a demo account for the others behind the same address
        for (int i = 0; i < 12; i++) {
            assertThat(loginFrom(shared, i % 2 == 0 ? "demo-admin@kirayla.az" : "Demo-Admin@Kirayla.AZ", "wrong-" + i)).isEqualTo(401);
        }
        for (String email : SEED_LOGINS) assertThat(loginFrom(shared, email, DEMO_PASSWORD)).as(email).isEqualTo(200);

        // every other account keeps the per-(address, e-mail) lock
        Account victim = register("Locked");
        for (int i = 0; i < 8; i++) assertThat(loginFrom(shared, victim.email(), "nope")).isEqualTo(401);
        assertThat(loginFrom(shared, victim.email(), "Secret123!")).isEqualTo(429);
        assertThat(loginFrom(shared, "demo-admin@kirayla.az", DEMO_PASSWORD)).isEqualTo(200);

        // the per-address limit (40 failures) still applies to the demo accounts: 20 so far, 20 more
        for (int i = 0; i < 20; i++) assertThat(loginFrom(shared, SEED_LOGINS.get(i % 3), "wrong")).as("failure " + (21 + i)).isEqualTo(401);
        for (String email : SEED_LOGINS) assertThat(loginFrom(shared, email, DEMO_PASSWORD)).as(email).isEqualTo(429);
        // another address is unaffected
        assertThat(loginFrom("198.51.100.41", "demo-admin@kirayla.az", DEMO_PASSWORD)).isEqualTo(200);
    }

    @Test
    void concurrentAcceptAndDeclineOnlyOneWins() throws Exception {
        Account host = register("Racer Host");
        Account renter = register("Racer Renter");
        long listing = createListing(host, category(), "Yarış elanı " + unique("y"), "Bakı", 10);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < 6; round++) {
                LocalDate from = LocalDate.now().plusDays(30 + round * 3L);
                long booking = bookOk(renter, listing, from, from.plusDays(1));
                CountDownLatch go = new CountDownLatch(1);
                Callable<Integer> accept = () -> { go.await(); return mvc.perform(auth(post("/api/bookings/" + booking + "/accept"), host)).andReturn().getResponse().getStatus(); };
                Callable<Integer> decline = () -> { go.await(); return mvc.perform(auth(post("/api/bookings/" + booking + "/decline"), host)).andReturn().getResponse().getStatus(); };
                Future<Integer> a = pool.submit(accept);
                Future<Integer> d = pool.submit(decline);
                go.countDown();
                assertThat(List.of(a.get(), d.get())).as("round " + round).containsExactlyInAnyOrder(200, 409);
                String status = read(mvc.perform(auth(get("/api/bookings/" + booking), host))).get("status").asText();
                assertThat(status).isEqualTo(a.get() == 200 ? "ACCEPTED" : "DECLINED");
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
