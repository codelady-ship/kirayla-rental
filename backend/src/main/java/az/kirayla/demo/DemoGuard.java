package az.kirayla.demo;

import az.kirayla.common.ApiException;
import az.kirayla.security.AuthUser;
import az.kirayla.security.CurrentUser;
import org.springframework.http.HttpStatus;

/**
 * Keeps the shared demo catalogue intact. The demo renter and demo host ({@code users.demo_protected}) are
 * logged into by any visitor, so through those accounts:
 * <ul>
 *   <li>seeded listings (and their photos and seeded calendar blocks) cannot be edited, archived or deleted;</li>
 *   <li>the account's own profile cannot be edited.</li>
 * </ul>
 * Everything a visitor creates with these accounts (new listings, bookings, messages, blocks) stays fully
 * editable and is removed by {@link DemoCleanup} after a day.
 */
public final class DemoGuard {
    public static final String CODE = "DEMO_PROTECTED";
    public static final String MESSAGE =
            "This belongs to the shared demo data and cannot be changed. Create your own listing to try editing.";

    private DemoGuard() {}

    private static boolean protectedAccount() {
        return CurrentUser.optional().map(AuthUser::demoProtected).orElse(false);
    }

    /** Refuses a change to a seeded listing made through a protected demo account. */
    public static void changeListing(Long listingId) {
        if (protectedAccount() && SeedData.isSeed(listingId)) throw refused();
    }

    /** Refuses the removal of a seeded calendar block made through a protected demo account. */
    public static void removeBlock(Long blockId) {
        if (protectedAccount() && SeedData.isSeed(blockId)) throw refused();
    }

    /** Refuses a profile edit of a protected demo account. */
    public static void changeProfile() {
        if (protectedAccount()) throw refused();
    }

    private static ApiException refused() {
        return new ApiException(HttpStatus.FORBIDDEN, CODE, MESSAGE);
    }
}
