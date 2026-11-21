package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.demo.DemoGuard;
import az.kirayla.domain.RefreshToken;
import az.kirayla.domain.User;
import az.kirayla.repo.RefreshTokenRepository;
import az.kirayla.repo.UserRepository;
import az.kirayla.security.JwtService;
import az.kirayla.security.LoginRateLimiter;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Mapper mapper;
    private final RefreshTokenRepository refreshTokens;
    private final LoginRateLimiter limiter;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, Mapper mapper,
                       RefreshTokenRepository refreshTokens, LoginRateLimiter limiter) {
        this.refreshTokens = refreshTokens;
        this.limiter = limiter;
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.mapper = mapper;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "An account with this email already exists");
        }
        User u = new User();
        u.setEmail(email);
        u.setFullName(req.name().trim());
        u.setCity(blankToNull(req.city()));
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        return tokens(u);
    }

    /** {@code clientAddress} is the caller's network address, used only to rate-limit failed attempts. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest req, String clientAddress) {
        String email = req.email().trim();
        limiter.check(clientAddress, email);
        User u = users.findByEmailIgnoreCase(email)
                .filter(x -> isBcrypt(x.getPasswordHash()) && encoder.matches(req.password(), x.getPasswordHash()))
                .orElse(null);
        if (u == null) {
            limiter.failed(clientAddress, email);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Wrong email or password");
        }
        if (!u.isEnabled()) throw ApiException.forbidden("This account has been disabled");
        limiter.succeeded(clientAddress, email);
        return tokens(u);
    }

    /**
     * Rotation: a refresh token works exactly once. Using it deletes its row and issues a new pair; a token
     * that was already used, logged out or never issued by this server is refused.
     */
    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        ApiException invalid = new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Refresh token is invalid or expired");
        JwtService.Refresh token = jwt.verifyRefresh(req.refreshToken()).orElseThrow(() -> invalid);
        if (refreshTokens.revoke(token.id()) == 0) throw invalid;
        User u = users.findById(token.userId()).filter(User::isEnabled).orElseThrow(() -> invalid);
        return tokens(u);
    }

    /** Revokes the given refresh token. Unknown or already spent tokens are ignored: logging out always succeeds. */
    @Transactional
    public void logout(RefreshRequest req) {
        jwt.verifyRefresh(req.refreshToken()).ifPresent(t -> refreshTokens.revoke(t.id()));
    }

    /** Seed users that are not demo logins carry a placeholder instead of a hash and can never sign in. */
    private static boolean isBcrypt(String hash) {
        return hash != null && hash.startsWith("$2");
    }

    @Transactional(readOnly = true)
    public UserDto me(Long id) {
        return mapper.user(users.findById(id).orElseThrow(ApiException::unauthorized));
    }

    @Transactional
    public UserDto updateProfile(Long id, UpdateProfileRequest req) {
        DemoGuard.changeProfile();
        User u = users.findById(id).orElseThrow(ApiException::unauthorized);
        u.setFullName(req.name().trim());
        u.setCity(blankToNull(req.city()));
        u.setBio(blankToNull(req.bio()));
        return mapper.user(u);
    }

    @Transactional(readOnly = true)
    public PublicUser publicProfile(Long id) {
        User u = users.findById(id).filter(User::isEnabled).orElseThrow(() -> ApiException.notFound("User"));
        return mapper.publicUser(u);
    }

    private AuthResponse tokens(User u) {
        String id = java.util.UUID.randomUUID().toString();
        refreshTokens.save(new RefreshToken(id, u.getId(), java.time.LocalDateTime.now().plus(jwt.refreshTtl())));
        return new AuthResponse(jwt.accessToken(u), jwt.refreshToken(u, id), mapper.user(u));
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
