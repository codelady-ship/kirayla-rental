package az.kirayla.web;

import az.kirayla.security.CurrentUser;
import az.kirayla.service.AuthService;
import az.kirayla.web.dto.Dtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Auth & users")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/api/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, jakarta.servlet.http.HttpServletRequest http) {
        return auth.login(req, http.getRemoteAddr());
    }

    /** Revokes the refresh token; the short-lived access token simply expires. */
    @PostMapping("/api/auth/logout")
    public org.springframework.http.ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest req) {
        auth.logout(req);
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @PostMapping("/api/auth/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req);
    }

    @GetMapping("/api/auth/me")
    public UserDto me() {
        return auth.me(CurrentUser.id());
    }

    @PutMapping("/api/users/me")
    public UserDto updateMe(@Valid @RequestBody UpdateProfileRequest req) {
        return auth.updateProfile(CurrentUser.id(), req);
    }

    @GetMapping("/api/users/{id}")
    public PublicUser publicProfile(@PathVariable Long id) {
        return auth.publicProfile(id);
    }
}
