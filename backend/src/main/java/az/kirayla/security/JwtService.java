package az.kirayla.security;

import az.kirayla.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and verifies HS256 JWTs. Access tokens live 15 minutes, refresh tokens 14 days;
 * the {@code typ} claim tells them apart so a refresh token can never be used as an access token.
 */
@Service
public class JwtService {
    public static final String ACCESS = "access";
    public static final String REFRESH = "refresh";

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(@Value("${kirayla.jwt.secret:}") String secret,
                      @Value("${kirayla.jwt.access-ttl:15m}") Duration accessTtl,
                      @Value("${kirayla.jwt.refresh-ttl:14d}") Duration refreshTtl) {
        if (secret == null || secret.isBlank() || secret.length() < 16) {
            throw new IllegalStateException("JWT_SECRET must be set (at least 16 characters)");
        }
        this.key = Keys.hmacShaKeyFor(sha256(secret));
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public String accessToken(User user) { return token(user, ACCESS, accessTtl); }

    public String refreshToken(User user) { return token(user, REFRESH, refreshTtl); }

    private String token(User user, String type, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("typ", type)
                .issuer("kirayla")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    /** Returns the user id if the token is valid, unexpired and of the expected type. */
    public Optional<Long> verify(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).requireIssuer("kirayla").build()
                    .parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("typ", String.class))) return Optional.empty();
            return Optional.of(Long.valueOf(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
