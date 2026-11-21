package az.kirayla;

import az.kirayla.domain.Category;
import az.kirayla.domain.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminAndSandboxTest extends IntegrationTestBase {

    @Test
    void regularUsersCannotUseAdminApi() throws Exception {
        Account user = register("User");
        mvc.perform(auth(get("/api/admin/stats"), user))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanModerate() throws Exception {
        Account admin = registerWith("Admin", Role.ADMIN, false);
        Account host = register("Host");
        Category c = category();
        long listing = createListing(host, c, "Elektrik dreli " + unique("d"), "Bakı", 8);

        mvc.perform(auth(get("/api/admin/stats"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").isNumber())
                .andExpect(jsonPath("$.bookingsByStatus.REQUESTED").isNumber())
                .andExpect(jsonPath("$.signupsByMonth.length()").value(6));

        mvc.perform(auth(patch("/api/admin/listings/" + listing), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("HIDDEN"));
        mvc.perform(get("/api/listings/" + listing)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/listings/" + listing), admin)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/admin/listings").param("status", "HIDDEN").param("q", "dreli"), admin))
                .andExpect(jsonPath("$.content[0].id").value(listing));

        mvc.perform(auth(patch("/api/admin/users/" + host.id()), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(auth(get("/api/auth/me"), host)).andExpect(status().isUnauthorized());
        mvc.perform(auth(patch("/api/admin/users/" + admin.id()), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isConflict());

        // reports
        Account reporter = register("Reporter");
        mvc.perform(auth(patch("/api/admin/listings/" + listing), admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ACTIVE\"}")).andExpect(status().isOk());
        mvc.perform(auth(post("/api/listings/" + listing + "/reports"), reporter).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "Şəkillər başqa elandan götürülüb"))))
                .andExpect(status().isCreated());
        long reportId = read(mvc.perform(auth(get("/api/admin/reports").param("status", "OPEN"), admin)))
                .get(0).get("id").asLong();
        mvc.perform(auth(patch("/api/admin/reports/" + reportId), admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        // categories
        String slug = unique("new-cat");
        String body = json.writeValueAsString(Map.of("slug", slug, "nameAz", "Yeni", "nameEn", "New", "icon", "box", "sortOrder", 99));
        long catId = read(mvc.perform(auth(post("/api/admin/categories"), admin).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())).get("id").asLong();
        mvc.perform(auth(delete("/api/admin/categories/" + catId), admin)).andExpect(status().isNoContent());
        mvc.perform(auth(delete("/api/admin/categories/" + c.getId()), admin))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }

    @Test
    void demoAdminCanReadButNeverWrite() throws Exception {
        Account demo = registerWith("DemoAdmin", Role.ADMIN, true);
        Account host = register("Host");
        long listing = createListing(host, category(), "Kayak " + unique("k"), "Bakı", 20);

        mvc.perform(auth(get("/api/admin/stats"), demo)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/admin/users"), demo)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/auth/me"), demo)).andExpect(jsonPath("$.readOnly").value(true));

        mvc.perform(auth(patch("/api/admin/listings/" + listing), demo).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("DEMO_READ_ONLY"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("read-only")));
        mvc.perform(auth(post("/api/listings"), demo).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("DEMO_READ_ONLY"));
        mvc.perform(get("/api/listings/" + listing)).andExpect(jsonPath("$.status").value("ACTIVE"));

        // login itself still works for the demo account
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", demo.email(), "password", "Secret123!"))))
                .andExpect(status().isOk());
    }
}
