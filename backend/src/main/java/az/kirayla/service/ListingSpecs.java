package az.kirayla.service;

import az.kirayla.domain.*;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Criteria for GET /api/listings. */
public final class ListingSpecs {
    private ListingSpecs() {}

    public record Filter(String q, String category, String city, BigDecimal minPrice, BigDecimal maxPrice,
                         LocalDate from, LocalDate to) {}

    public static Specification<Listing> search(Filter f) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(root.get("status"), ListingStatus.ACTIVE));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + f.q().trim().toLowerCase() + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like)));
            }
            if (f.category() != null && !f.category().isBlank()) {
                Join<Listing, Category> c = root.join("category");
                p.add(cb.equal(c.get("slug"), f.category().trim()));
            }
            if (f.city() != null && !f.city().isBlank()) {
                p.add(cb.equal(cb.lower(root.get("city")), f.city().trim().toLowerCase()));
            }
            if (f.minPrice() != null) p.add(cb.greaterThanOrEqualTo(root.get("dailyPrice"), f.minPrice()));
            if (f.maxPrice() != null) p.add(cb.lessThanOrEqualTo(root.get("dailyPrice"), f.maxPrice()));
            if (f.from() != null && f.to() != null) {
                // NOT EXISTS an ACCEPTED/REQUESTED booking or a host block overlapping [from, to]
                Subquery<Long> booked = query.subquery(Long.class);
                Root<Booking> b = booked.from(Booking.class);
                booked.select(b.get("id")).where(
                        cb.equal(b.get("listing"), root),
                        b.get("status").in(BookingStatus.ACCEPTED, BookingStatus.REQUESTED),
                        cb.lessThanOrEqualTo(b.get("startDate"), f.to()),
                        cb.greaterThanOrEqualTo(b.get("endDate"), f.from()));
                Subquery<Long> blocked = query.subquery(Long.class);
                Root<AvailabilityBlock> a = blocked.from(AvailabilityBlock.class);
                blocked.select(a.get("id")).where(
                        cb.equal(a.get("listing"), root),
                        cb.lessThanOrEqualTo(a.get("startDate"), f.to()),
                        cb.greaterThanOrEqualTo(a.get("endDate"), f.from()));
                p.add(cb.not(cb.exists(booked)));
                p.add(cb.not(cb.exists(blocked)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
