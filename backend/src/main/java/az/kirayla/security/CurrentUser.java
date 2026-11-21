package az.kirayla.security;

import az.kirayla.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/** Static access to the authenticated {@link AuthUser}. */
public final class CurrentUser {
    private CurrentUser() {}

    public static Optional<AuthUser> optional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser u) return Optional.of(u);
        return Optional.empty();
    }

    public static AuthUser require() {
        return optional().orElseThrow(ApiException::unauthorized);
    }

    public static Long id() {
        return require().id();
    }
}
