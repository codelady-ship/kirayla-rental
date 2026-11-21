package az.kirayla.config;

import az.kirayla.domain.Role;
import az.kirayla.domain.User;
import az.kirayla.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the real (writable) admin from ADMIN_EMAIL / ADMIN_PASSWORD on startup if it does not exist.
 * The password never lives in git; in the dev profile a local-only default is used.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
                          @Value("${kirayla.admin.email:}") String email,
                          @Value("${kirayla.admin.password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return;
        if (users.existsByEmailIgnoreCase(email.trim())) return;
        User admin = new User();
        admin.setEmail(email.trim().toLowerCase());
        admin.setFullName("Kirayla Admin");
        admin.setCity("Bakı");
        admin.setRole(Role.ADMIN);
        admin.setPasswordHash(encoder.encode(password));
        users.save(admin);
        log.info("Created admin account {}", admin.getEmail());
    }
}
