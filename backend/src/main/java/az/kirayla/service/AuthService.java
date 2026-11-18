package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.domain.User;
import az.kirayla.repo.UserRepository;
import az.kirayla.security.JwtService;
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

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, Mapper mapper) {
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

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .filter(x -> encoder.matches(req.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Wrong email or password"));
        if (!u.isEnabled()) throw ApiException.forbidden("This account has been disabled");
        return tokens(u);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest req) {
        User u = jwt.verify(req.refreshToken(), JwtService.REFRESH)
                .flatMap(users::findById)
                .filter(User::isEnabled)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Refresh token is invalid or expired"));
        return tokens(u);
    }

    @Transactional(readOnly = true)
    public UserDto me(Long id) {
        return mapper.user(users.findById(id).orElseThrow(ApiException::unauthorized));
    }

    @Transactional
    public UserDto updateProfile(Long id, UpdateProfileRequest req) {
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
        return new AuthResponse(jwt.accessToken(u), jwt.refreshToken(u), mapper.user(u));
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
