package az.kirayla.web.dto;

import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.ItemCondition;
import az.kirayla.domain.ListingStatus;
import az.kirayla.domain.ReportStatus;
import az.kirayla.domain.Role;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Request / response bodies of the public API (JSON camelCase). */
public final class Dtos {
    private Dtos() {}

    // ---------- users & auth ----------
    public record UserDto(Long id, String name, String email, Role role, String city, String bio,
                          String avatarUrl, LocalDateTime joinedAt, boolean readOnly) {}

    public record AuthResponse(String accessToken, String refreshToken, UserDto user) {}

    public record RegisterRequest(@NotBlank @Size(min = 2, max = 80) String name,
                                  @NotBlank @Email @Size(max = 160) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password,
                                  @Size(max = 60) String city) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UpdateProfileRequest(@NotBlank @Size(min = 2, max = 80) String name,
                                       @Size(max = 60) String city,
                                       @Size(max = 600) String bio) {}

    public record PublicUser(Long id, String name, String avatarUrl, String city, String bio,
                             LocalDateTime joinedAt, long listingCount, double ratingAvg, long reviewCount) {}

    public record UserRef(Long id, String name, String avatarUrl) {}

    // ---------- categories ----------
    public record CategoryDto(Long id, String slug, String nameAz, String nameEn, String icon,
                              long listingCount, int sortOrder, boolean active) {}

    public record CategoryRef(Long id, String slug, String nameAz, String nameEn, String icon) {}

    public record CategoryRequest(@NotBlank @Pattern(regexp = "[a-z0-9-]{2,60}") String slug,
                                  @NotBlank @Size(max = 80) String nameAz,
                                  @NotBlank @Size(max = 80) String nameEn,
                                  @NotBlank @Size(max = 40) String icon,
                                  int sortOrder,
                                  Boolean active) {}

    // ---------- listings ----------
    public record ListingCard(Long id, String title, String city, String district, BigDecimal dailyPrice,
                              BigDecimal deposit, String coverUrl, CategoryRef category, BigDecimal ratingAvg,
                              int reviewCount, Long hostId, String hostName, ListingStatus status,
                              LocalDateTime createdAt) {}

    public record PhotoDto(Long id, String url, String credit, String creditUrl) {}

    public record DateRange(LocalDate from, LocalDate to, String kind) {}

    public record ReviewDto(Long id, int rating, String comment, LocalDateTime createdAt, UserRef author) {}

    public record ListingDetail(Long id, String title, String city, String district, BigDecimal dailyPrice,
                                BigDecimal deposit, String coverUrl, CategoryRef category, BigDecimal ratingAvg,
                                int reviewCount, Long hostId, String hostName, ListingStatus status,
                                LocalDateTime createdAt, String description, ItemCondition condition,
                                int minDays, int maxDays, List<PhotoDto> photos, PublicUser host,
                                List<DateRange> unavailable, List<ReviewDto> reviews) {}

    public record ListingRequest(@NotBlank @Size(min = 4, max = 140) String title,
                                 @NotBlank @Size(min = 20, max = 4000) String description,
                                 @NotNull Long categoryId,
                                 @NotBlank @Size(max = 60) String city,
                                 @Size(max = 80) String district,
                                 @NotNull @DecimalMin(value = "0.01") @DecimalMax("10000") BigDecimal dailyPrice,
                                 @NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal deposit,
                                 @NotNull ItemCondition condition,
                                 @Min(1) @Max(90) int minDays,
                                 @Min(1) @Max(90) int maxDays) {
        @AssertTrue(message = "maxDays must be greater than or equal to minDays")
        public boolean isDayRangeValid() { return maxDays >= minDays; }
    }

    public record HostListing(Long id, String title, String city, String district, BigDecimal dailyPrice,
                              BigDecimal deposit, String coverUrl, CategoryRef category, BigDecimal ratingAvg,
                              int reviewCount, Long hostId, String hostName, ListingStatus status,
                              LocalDateTime createdAt, long photoCount, long bookingCount, long pendingCount) {}

    public record BlockDto(Long id, LocalDate from, LocalDate to, String note) {}

    public record BlockRequest(@NotNull LocalDate from, @NotNull LocalDate to, @Size(max = 200) String note) {
        @AssertTrue(message = "to must not be before from")
        public boolean isRangeValid() { return from == null || to == null || !to.isBefore(from); }
    }

    public record ReportRequest(@NotBlank @Size(min = 5, max = 500) String reason) {}

    // ---------- bookings ----------
    public record ListingRef(Long id, String title, String coverUrl, String city) {}

    public record BookingDto(Long id, ListingRef listing, UserRef renter, UserRef host, LocalDate startDate,
                             LocalDate endDate, int days, BigDecimal dailyPrice, BigDecimal rentalTotal,
                             BigDecimal deposit, BigDecimal totalDue, BookingStatus status, String message,
                             LocalDateTime createdAt, boolean reviewed, Long conversationId) {}

    public record BookingRequest(@NotNull Long listingId, @NotNull LocalDate startDate, @NotNull LocalDate endDate,
                                 @Size(max = 500) String message) {}

    public record ReviewRequest(@Min(1) @Max(5) int rating, @NotBlank @Size(min = 5, max = 1000) String comment) {}

    // ---------- messages ----------
    public record ConversationListingRef(Long id, String title, String coverUrl) {}

    public record ConversationDto(Long id, ConversationListingRef listing, UserRef other, String lastMessage,
                                  LocalDateTime lastMessageAt, long unreadCount) {}

    public record MessageDto(Long id, Long senderId, String body, LocalDateTime createdAt, boolean mine) {}

    public record StartConversationRequest(@NotNull Long listingId, @NotBlank @Size(max = 2000) String body) {}

    public record SendMessageRequest(@NotBlank @Size(min = 1, max = 2000) String body) {}

    public record CountDto(long count) {}

    // ---------- host ----------
    public record MonthAmount(String month, BigDecimal amount) {}

    public record TopListing(Long id, String title, BigDecimal amount, long bookings) {}

    public record EarningsDto(BigDecimal totalEarned, BigDecimal upcoming, long pendingRequests, long completedCount,
                              BigDecimal averageDailyPrice, List<MonthAmount> monthly, List<TopListing> topListings) {}

    // ---------- admin ----------
    public record MonthCount(String month, long count) {}

    public record AdminStats(long users, long listings, long activeListings, long hiddenListings, long bookings,
                             BigDecimal gmv, long openReports, Map<String, Long> bookingsByStatus,
                             List<MonthCount> signupsByMonth) {}

    public record AdminUser(Long id, String name, String email, Role role, String city, boolean enabled,
                            boolean readOnly, long listingCount, long bookingCount, LocalDateTime joinedAt) {}

    public record AdminUserPatch(Boolean enabled, Role role) {}

    public record AdminListing(Long id, String title, String hostName, String city, String categoryNameAz,
                               String categoryNameEn, BigDecimal dailyPrice, ListingStatus status, long reportCount,
                               LocalDateTime createdAt, String coverUrl) {}

    public record AdminListingPatch(@NotNull ListingStatus status) {}

    public record ReportListingRef(Long id, String title, ListingStatus status) {}

    public record ReportDto(Long id, ReportListingRef listing, UserRef reporter, String reason, ReportStatus status,
                            LocalDateTime createdAt) {}

    public record ReportPatch(@NotNull ReportStatus status) {}
}
