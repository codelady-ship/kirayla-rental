package az.kirayla;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends IntegrationTestBase {

    @Test
    void registerLoginMeAndRefresh() throws Exception {
        Account a = register("Leyla");

        mvc.perform(auth(get("/api/auth/me"), a))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(a.email()))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.readOnly").value(false))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        JsonNode login = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", a.email().toUpperCase(), "password", "Secret123!"))))
                .andExpect(status().isOk()));
        String refresh = login.get("refreshToken").asText();

        // a refresh token is not accepted as an access token
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + refresh))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("refreshToken", refresh))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value(a.id()));
    }

    @Test
    void duplicateEmailAndBadPasswordAndValidation() throws Exception {
        Account a = register("Murad");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Murad", "email", a.email(), "password", "Secret123!"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", a.email(), "password", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("BAD_CREDENTIALS"));

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "X", "email", "not-an-email", "password", "short"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void protectedEndpointsAnswerJson401() throws Exception {
        mvc.perform(get("/api/bookings/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer garbage"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profileUpdateAndPublicProfile() throws Exception {
        Account a = register("Nigar");
        mvc.perform(auth(put("/api/users/me"), a).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Nigar Əliyeva", "city", "Gəncə", "bio", "Fotoqraf"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nigar Əliyeva"));
        mvc.perform(get("/api/users/" + a.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.city").value("Gəncə"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }
}
