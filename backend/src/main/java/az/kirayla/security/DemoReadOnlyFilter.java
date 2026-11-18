package az.kirayla.security;

import az.kirayla.common.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Public-demo sandbox: accounts flagged {@code demo_read_only} (the demo admin) can look at
 * everything but every write (non-GET) request is refused with 403 DEMO_READ_ONLY, so portfolio
 * visitors cannot wreck the shared data. Runs after {@link JwtAuthFilter}.
 */
public class DemoReadOnlyFilter extends OncePerRequestFilter {
    public static final String MESSAGE = "Demo admin is read-only — changes are disabled in the public demo.";
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final Set<String> ALLOWED_PATHS = Set.of("/api/auth/login", "/api/auth/refresh");

    private final ObjectMapper mapper;

    public DemoReadOnlyFilter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        boolean readOnly = CurrentUser.optional().map(AuthUser::readOnly).orElse(false);
        if (readOnly && !SAFE_METHODS.contains(req.getMethod()) && !ALLOWED_PATHS.contains(req.getRequestURI())) {
            res.setStatus(403);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.setCharacterEncoding(StandardCharsets.UTF_8.name());
            mapper.writeValue(res.getOutputStream(), ErrorResponse.of(403, "DEMO_READ_ONLY", MESSAGE));
            return;
        }
        chain.doFilter(req, res);
    }
}
