package az.kirayla.demo;

/**
 * The Flyway seed (V2) inserts explicit ids and V3 restarts every identity at {@value #FIRST_VISITOR_ID},
 * so a row's id tells seed data apart from anything created while the application runs.
 */
public final class SeedData {
    public static final long FIRST_VISITOR_ID = 10_000L;

    /** The three demo accounts whose password is printed on the login page. */
    public static final java.util.Set<String> PUBLIC_LOGINS =
            java.util.Set.of("aysel@share.az", "rashad@share.az", "demo-admin@share.az");

    private SeedData() {}

    public static boolean isSeed(Long id) {
        return id != null && id < FIRST_VISITOR_ID;
    }
}
