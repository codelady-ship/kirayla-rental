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

class ListingSearchTest extends IntegrationTestBase {
    private Category cat;
    private String token;
    private long cheap;
    private long pricey;
    private long ganja;
    private Account host;

    @BeforeEach
    void setUp() throws Exception {
        host = register("Host");
        cat = category();
        token = unique("zq");
        cheap = createListing(host, cat, "Velosiped " + token + " şəhər", "Bakı", 10);
        pricey = createListing(host, cat, "Kamera " + token + " Sony", "Bakı", 60);
        ganja = createListing(host, cat, "Çadır " + token + " 4 nəfərlik", "Gəncə", 25);
    }

    @Test
    void filtersByTextCategoryCityAndPrice() throws Exception {
        mvc.perform(get("/api/listings").param("q", token.toUpperCase()).param("category", cat.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].category.slug").value(cat.getSlug()));

        mvc.perform(get("/api/listings").param("category", cat.getSlug()).param("city", "gəncə"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(ganja));

        mvc.perform(get("/api/listings").param("category", cat.getSlug()).param("minPrice", "20").param("maxPrice", "50"))
                .andExpect(jsonPath("$.content[*].id", contains((int) ganja)));
    }

    @Test
    void sortsAndPaginates() throws Exception {
        mvc.perform(get("/api/listings").param("category", cat.getSlug()).param("sort", "price_asc"))
                .andExpect(jsonPath("$.content[0].id").value(cheap))
                .andExpect(jsonPath("$.content[2].id").value(pricey));
        mvc.perform(get("/api/listings").param("category", cat.getSlug()).param("sort", "price_desc")
                        .param("size", "2").param("page", "1"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(cheap));
    }

    @Test
    void dateFilterExcludesBookedAndBlockedListings() throws Exception {
        Account renter = register("Renter");
        LocalDate from = LocalDate.now().plusDays(10);
        bookOk(renter, cheap, from, from.plusDays(2));
        mvc.perform(auth(post("/api/listings/" + pricey + "/blocks"), host).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("from", from.plusDays(2).toString(), "to", from.plusDays(5).toString()))))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/listings").param("category", cat.getSlug())
                        .param("from", from.plusDays(1).toString()).param("to", from.plusDays(3).toString()))
                .andExpect(jsonPath("$.content[*].id", contains((int) ganja)));
        // a later window is free for everyone
        mvc.perform(get("/api/listings").param("category", cat.getSlug())
                        .param("from", from.plusDays(20).toString()).param("to", from.plusDays(21).toString()))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void detailShowsUnavailableRangesAndHiddenListingIs404ForPublic() throws Exception {
        Account renter = register("Renter");
        LocalDate from = LocalDate.now().plusDays(3);
        bookOk(renter, ganja, from, from.plusDays(1));
        mvc.perform(get("/api/listings/" + ganja))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.host.id").value(host.id()))
                .andExpect(jsonPath("$.unavailable[0].kind").value("BOOKED"))
                .andExpect(jsonPath("$.unavailable[0].from").value(from.toString()));

        mvc.perform(auth(delete("/api/listings/" + ganja), host)).andExpect(status().isNoContent());
        mvc.perform(get("/api/listings/" + ganja)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void onlyOwnerCanEditAndPhotosAreValidated() throws Exception {
        Account other = register("Other");
        mvc.perform(auth(delete("/api/listings/" + cheap), other)).andExpect(status().isForbidden());

        var png = new org.springframework.mock.web.MockMultipartFile("files", "a.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0});
        mvc.perform(auth(multipart("/api/listings/" + cheap + "/photos").file(png), host))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].url", startsWith("http://localhost:8080/api/uploads/listings/")));

        var fake = new org.springframework.mock.web.MockMultipartFile("files", "a.png", "image/png", "not an image".getBytes());
        mvc.perform(auth(multipart("/api/listings/" + cheap + "/photos").file(fake), host))
                .andExpect(status().isBadRequest());
    }
}
