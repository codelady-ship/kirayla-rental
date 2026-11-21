package az.kirayla.security;

import az.kirayla.domain.Role;

/** Authenticated principal stored in the SecurityContext. */
public record AuthUser(Long id, String email, Role role, boolean readOnly, boolean demoProtected) {
    public boolean isAdmin() { return role == Role.ADMIN; }
}
