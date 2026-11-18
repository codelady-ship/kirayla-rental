package az.kirayla;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// JWT only: no default in-memory user / generated password.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class KiraylaApplication {
    public static void main(String[] args) {
        SpringApplication.run(KiraylaApplication.class, args);
    }
}
