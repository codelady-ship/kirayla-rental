package az.kirayla.service;

import az.kirayla.domain.Booking;
import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.Listing;
import az.kirayla.domain.ListingStatus;
import az.kirayla.repo.BookingRepository;
import az.kirayla.repo.ListingRepository;
import az.kirayla.security.CurrentUser;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.*;

@Service
public class HostService {
    private final BookingRepository bookings;
    private final ListingRepository listings;

    public HostService(BookingRepository bookings, ListingRepository listings) {
        this.bookings = bookings;
        this.listings = listings;
    }

    @Transactional(readOnly = true)
    public EarningsDto earnings() {
        Long me = CurrentUser.id();
        List<Booking> earning = bookings.findByListingOwnerIdAndStatusIn(me,
                Set.of(BookingStatus.COMPLETED, BookingStatus.ACCEPTED));

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal upcoming = BigDecimal.ZERO;
        long completed = 0;
        for (Booking b : earning) {
            if (b.getStatus() == BookingStatus.COMPLETED) {
                total = total.add(b.getRentalTotal());
                completed++;
            } else {
                upcoming = upcoming.add(b.getRentalTotal());
            }
        }
        long pending = bookings.findByListingOwnerIdAndStatusOrderByCreatedAtDesc(me, BookingStatus.REQUESTED).size();

        YearMonth now = YearMonth.now();
        Map<YearMonth, BigDecimal> byMonth = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) byMonth.put(now.minusMonths(i), BigDecimal.ZERO);
        for (Booking b : earning) {
            byMonth.computeIfPresent(YearMonth.from(b.getStartDate()), (k, v) -> v.add(b.getRentalTotal()));
        }
        List<MonthAmount> monthly = byMonth.entrySet().stream()
                .map(e -> new MonthAmount(e.getKey().toString(), e.getValue())).toList();

        Map<Long, BigDecimal> amountByListing = new HashMap<>();
        Map<Long, Long> countByListing = new HashMap<>();
        Map<Long, String> titles = new HashMap<>();
        for (Booking b : earning) {
            Listing l = b.getListing();
            amountByListing.merge(l.getId(), b.getRentalTotal(), BigDecimal::add);
            countByListing.merge(l.getId(), 1L, Long::sum);
            titles.put(l.getId(), l.getTitle());
        }
        List<TopListing> top = amountByListing.entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(5)
                .map(e -> new TopListing(e.getKey(), titles.get(e.getKey()), e.getValue(), countByListing.get(e.getKey())))
                .toList();

        List<Listing> mine = listings.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(me, ListingStatus.ARCHIVED);
        BigDecimal avgDaily = mine.isEmpty() ? BigDecimal.ZERO
                : mine.stream().map(Listing::getDailyPrice).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(mine.size()), 2, RoundingMode.HALF_UP);

        return new EarningsDto(total, upcoming, pending, completed, avgDaily, monthly, top);
    }
}
