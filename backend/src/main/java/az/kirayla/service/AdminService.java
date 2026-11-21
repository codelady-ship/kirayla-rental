package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.common.PageResponse;
import az.kirayla.domain.*;
import az.kirayla.repo.*;
import az.kirayla.security.CurrentUser;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
public class AdminService {
    private final UserRepository users;
    private final ListingRepository listings;
    private final BookingRepository bookings;
    private final ReportRepository reports;
    private final Mapper mapper;

    public AdminService(UserRepository users, ListingRepository listings, BookingRepository bookings,
                        ReportRepository reports, Mapper mapper) {
        this.users = users;
        this.listings = listings;
        this.bookings = bookings;
        this.reports = reports;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public AdminStats stats() {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (BookingStatus s : BookingStatus.values()) byStatus.put(s.name(), bookings.countByStatus(s));

        YearMonth now = YearMonth.now();
        Map<YearMonth, Long> signups = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) signups.put(now.minusMonths(i), 0L);
        LocalDateTime since = now.minusMonths(5).atDay(1).atStartOfDay();
        users.findByCreatedAtAfter(since.minusSeconds(1))
                .forEach(u -> signups.computeIfPresent(YearMonth.from(u.getCreatedAt()), (k, v) -> v + 1));

        return new AdminStats(users.count(), listings.count(), listings.countByStatus(ListingStatus.ACTIVE),
                listings.countByStatus(ListingStatus.HIDDEN), bookings.count(),
                bookings.sumRentalTotal(Set.of(BookingStatus.ACCEPTED, BookingStatus.COMPLETED)),
                reports.countByStatus(ReportStatus.OPEN), byStatus,
                signups.entrySet().stream().map(e -> new MonthCount(e.getKey().toString(), e.getValue())).toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUser> users(String q, int page, int size) {
        Pageable pr = pageable(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        boolean demo = CurrentUser.require().readOnly();
        Page<User> p = demo ? users.searchPublicFields(like(q), pr) : users.search(like(q), pr);
        return PageResponse.of(p, this::adminUser);
    }

    @Transactional
    public AdminUser patchUser(Long id, AdminUserPatch patch) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        boolean self = u.getId().equals(CurrentUser.id());
        if (patch.enabled() != null) {
            if (self && !patch.enabled()) throw ApiException.invalidState("You cannot disable your own account");
            u.setEnabled(patch.enabled());
        }
        if (patch.role() != null) {
            if (self && patch.role() != Role.ADMIN) throw ApiException.invalidState("You cannot remove your own admin role");
            u.setRole(patch.role());
        }
        return adminUser(u);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminListing> listings(String q, ListingStatus status, int page, int size) {
        Pageable pr = pageable(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<Listing> p = status == null ? listings.adminSearch(like(q), pr) : listings.adminSearchByStatus(like(q), status, pr);
        return PageResponse.of(p, this::adminListing);
    }

    @Transactional
    public AdminListing patchListing(Long id, AdminListingPatch patch) {
        if (patch.status() == ListingStatus.ARCHIVED) throw ApiException.validation("Status must be ACTIVE or HIDDEN");
        Listing l = listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing"));
        l.setStatus(patch.status());
        l.setUpdatedAt(LocalDateTime.now());
        return adminListing(l);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingDto> bookings(BookingStatus status, int page, int size) {
        Pageable pr = pageable(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<Booking> p = status == null ? bookings.findAll(pr) : bookings.findByStatus(status, pr);
        return PageResponse.of(p, mapper::booking);
    }

    @Transactional(readOnly = true)
    public List<ReportDto> reports(ReportStatus status) {
        List<Report> list = status == null ? reports.findAllByOrderByCreatedAtDesc() : reports.findByStatusOrderByCreatedAtDesc(status);
        return list.stream().map(this::report).toList();
    }

    @Transactional
    public ReportDto patchReport(Long id, ReportPatch patch) {
        Report r = reports.findById(id).orElseThrow(() -> ApiException.notFound("Report"));
        r.setStatus(patch.status());
        return report(r);
    }

    private ReportDto report(Report r) {
        Listing l = r.getListing();
        return new ReportDto(r.getId(), new ReportListingRef(l.getId(), l.getTitle(), l.getStatus()),
                mapper.ref(r.getReporter()), r.getReason(), r.getStatus(), r.getCreatedAt());
    }

    private AdminUser adminUser(User u) {
        return new AdminUser(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.getCity(), u.isEnabled(),
                u.isDemoReadOnly(), listings.countByOwnerIdAndStatusNot(u.getId(), ListingStatus.ARCHIVED),
                bookings.countByRenterId(u.getId()), u.getCreatedAt());
    }

    private AdminListing adminListing(Listing l) {
        return new AdminListing(l.getId(), l.getTitle(), l.getOwner().getFullName(), l.getCity(),
                l.getCategory().getNameAz(), l.getCategory().getNameEn(), l.getDailyPrice(), l.getStatus(),
                reports.countByListingId(l.getId()), l.getCreatedAt(), l.coverUrl());
    }

    private static String like(String q) {
        return q == null || q.isBlank() ? "%" : "%" + q.trim().toLowerCase() + "%";
    }

    private static Pageable pageable(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), sort);
    }
}
