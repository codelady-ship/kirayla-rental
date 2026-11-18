package az.kirayla;

import az.kirayla.domain.Category;
import az.kirayla.domain.Role;
import az.kirayla.domain.User;
import az.kirayla.repo.CategoryRepository;
import az.kirayla.repo.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Shared fixtures for MockMvc integration tests. Every fixture uses unique names so seed data never collides. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {
    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository users;
    @Autowired protected CategoryRepository categories;

    protected record Account(Long id, String email, String token) {}

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected Account register(String name) throws Exception {
        String email = unique(name.toLowerCase().replaceAll("[^a-z0-9]", "")) + "@test.kirayla.az";
        JsonNode body = read(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", name, "email", email,
                                "password", "Secret123!", "city", "Bakı"))))
                .andExpect(status().isCreated()));
        return new Account(body.at("/user/id").asLong(), email, body.get("accessToken").asText());
    }

    /** Registers a user, then flips role / read-only flag directly in the DB and logs in again. */
    protected Account registerWith(String name, Role role, boolean readOnly) throws Exception {
        Account a = register(name);
        User u = users.findById(a.id()).orElseThrow();
        u.setRole(role);
        u.setDemoReadOnly(readOnly);
        users.save(u);
        JsonNode body = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", a.email(), "password", "Secret123!")))));
        return new Account(a.id(), a.email(), body.get("accessToken").asText());
    }

    protected Category category() {
        Category c = new Category();
        String slug = unique("cat");
        c.setSlug(slug);
        c.setNameAz("Kateqoriya " + slug);
        c.setNameEn("Category " + slug);
        c.setIcon("box");
        return categories.save(c);
    }

    protected long createListing(Account owner, Category c, String title, String city, int price) throws Exception {
        Map<String, Object> req = Map.of(
                "title", title,
                "description", "A well-kept item, perfect for weekend projects and trips.",
                "categoryId", c.getId(),
                "city", city,
                "district", "Nəsimi",
                "dailyPrice", price,
                "deposit", 50,
                "condition", "LIKE_NEW",
                "minDays", 1,
                "maxDays", 14);
        JsonNode body = read(mvc.perform(auth(post("/api/listings"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(req))).andExpect(status().isCreated()));
        return body.get("id").asLong();
    }

    protected ResultActions book(Account renter, long listingId, LocalDate from, LocalDate to) throws Exception {
        return mvc.perform(auth(post("/api/bookings"), renter).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("listingId", listingId,
                        "startDate", from.toString(), "endDate", to.toString()))));
    }

    protected long bookOk(Account renter, long listingId, LocalDate from, LocalDate to) throws Exception {
        return read(book(renter, listingId, from, to).andExpect(status().isCreated())).get("id").asLong();
    }

    protected MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder b, Account a) {
        return b.header("Authorization", "Bearer " + a.token());
    }

    protected JsonNode read(ResultActions r) throws Exception {
        String s = r.andReturn().getResponse().getContentAsString();
        return s.isEmpty() ? json.nullNode() : json.readTree(s);
    }
}
