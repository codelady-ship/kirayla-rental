package az.kirayla;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// JWT only: no default in-memory user / generated password.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@org.springframework.scheduling.annotation.EnableScheduling
public class KiraylaApplication {
    /**
     * Kirayla is a Baku marketplace: "today" for bookings and every timestamp the API returns are
     * Baku wall-clock time, whatever zone the host runs in (Render containers run in UTC).
     */
    public static final String ZONE = "Asia/Baku";

    public static void main(String[] args) {
        // must happen before any JDBC / Hibernate class is loaded, so the whole process agrees on one zone
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone(ZONE));
        SpringApplication.run(KiraylaApplication.class, args);
    }
}
