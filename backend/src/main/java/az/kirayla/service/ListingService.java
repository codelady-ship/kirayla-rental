package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.common.PageResponse;
import az.kirayla.demo.DemoGuard;
import az.kirayla.domain.*;
import az.kirayla.repo.*;
import az.kirayla.security.AuthUser;
import az.kirayla.security.CurrentUser;
import az.kirayla.storage.StorageService;
import az.kirayla.web.dto.Dtos.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
public class ListingService {
    public static final int MAX_PHOTOS = 8;
    private static final Set<BookingStatus> HOLDING = Set.of(BookingStatus.ACCEPTED, BookingStatus.REQUESTED);

    private final ListingRepository listings;
    private final CategoryRepository categories;
    private final UserRepository users;
    private final BookingRepository bookings;
    private final AvailabilityBlockRepository blocks;
    private final ReviewRepository reviews;
    private final ReportRepository reports;
    private final ListingPhotoRepository photos;
    private final StorageService storage;
    private final Mapper mapper;

    public ListingService(ListingRepository listings, CategoryRepository categories, UserRepository users,
                          BookingRepository bookings, AvailabilityBlockRepository blocks, ReviewRepository reviews,
                          ReportRepository reports, ListingPhotoRepository photos, StorageService storage,
                          Mapper mapper) {
        this.listings = listings;
        this.categories = categories;
        this.users = users;
        this.bookings = bookings;
        this.blocks = blocks;
        this.reviews = reviews;
        this.reports = reports;
        this.photos = photos;
        this.storage = storage;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ListingCard> search(ListingSpecs.Filter filter, String sort, int page, int size) {
        if (filter.from() != null && filter.to() != null && filter.to().isBefore(filter.from())) {
            throw ApiException.validation("to must not be before from");
        }
        Sort order = switch (sort == null ? "newest" : sort) {
            case "price_asc" -> Sort.by(Sort.Order.asc("dailyPrice"), Sort.Order.desc("id"));
            case "price_desc" -> Sort.by(Sort.Order.desc("dailyPrice"), Sort.Order.desc("id"));
            case "rating" -> Sort.by(Sort.Order.desc("ratingAvg"), Sort.Order.desc("reviewCount"), Sort.Order.desc("id"));
            default -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        };
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 48), order);
        return PageResponse.of(listings.findAll(ListingSpecs.search(filter), pr), mapper::card);
    }

    /** Bookings that count as a rental for {@link #highlights}: accepted by the host or completed. */
    static final Set<BookingStatus> RENTED = Set.of(BookingStatus.ACCEPTED, BookingStatus.COMPLETED);
    static final int MAX_HIGHLIGHTS = 12;

    /** A new listing waits this long before it can appear among the home page's "newest" cards. */
    static final java.time.Duration NEWEST_MIN_AGE = java.time.Duration.ofHours(1);

    /**
     * The home page's floating cards. Rule: active listings with a photo, alternating the most rented one
     * (most accepted + completed bookings; ties: the newer listing, then the higher id) and the newest one,
     * starting with the most rented, never the same listing twice; when one list runs out the other fills the
     * rest. Listings visitors add through the shared demo accounts never appear (their seeded catalogue does);
     * a "newest" card must also be at least {@link #NEWEST_MIN_AGE} old and have no open report.
     */
    @Transactional(readOnly = true)
    public List<ListingCard> highlights(int size) {
        int n = Math.min(Math.max(size, 1), MAX_HIGHLIGHTS);
        // enough candidates from each list that duplicates can never leave a slot empty
        PageRequest top = PageRequest.of(0, n);
        long firstVisitorId = az.kirayla.demo.SeedData.FIRST_VISITOR_ID;
        List<Long> ids = alternate(bookings.mostRentedListingIds(RENTED, ListingStatus.ACTIVE, firstVisitorId, top),
                listings.newestHighlightIds(ListingStatus.ACTIVE, LocalDateTime.now().minus(NEWEST_MIN_AGE),
                        firstVisitorId, ReportStatus.OPEN, top), n);
        java.util.Map<Long, Listing> byId = new java.util.HashMap<>();
        listings.findAllById(ids).forEach(l -> byId.put(l.getId(), l));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).map(mapper::card).toList();
    }

    /**
     * Takes turns: the next not yet chosen id of {@code a}, then of {@code b}, and so on, up to {@code n};
     * once one list is used up the other fills the rest.
     */
    static List<Long> alternate(List<Long> a, List<Long> b, int n) {
        java.util.LinkedHashSet<Long> out = new java.util.LinkedHashSet<>();
        int i = 0, j = 0;
        boolean turnA = true;
        while (out.size() < n && (i < a.size() || j < b.size())) {
            if (turnA) {
                while (i < a.size() && !out.add(a.get(i++))) { /* already chosen: skip */ }
            } else {
                while (j < b.size() && !out.add(b.get(j++))) { /* already chosen: skip */ }
            }
            turnA = !turnA;
        }
        return List.copyOf(out);
    }

    @Transactional(readOnly = true)
    public ListingDetail detail(Long id) {
        Listing l = listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing"));
        if (l.getStatus() != ListingStatus.ACTIVE) {
            AuthUser me = CurrentUser.optional().orElse(null);
            boolean allowed = me != null && (me.isAdmin() || me.id().equals(l.getOwner().getId()));
            if (!allowed) throw ApiException.notFound("Listing");
        }
        return toDetail(l);
    }

    ListingDetail toDetail(Listing l) {
        LocalDate today = LocalDate.now();
        List<DateRange> unavailable = new ArrayList<>();
        bookings.findByListingIdAndStatusInAndEndDateGreaterThanEqualOrderByStartDateAsc(l.getId(), HOLDING, today)
                .forEach(b -> unavailable.add(new DateRange(b.getStartDate(), b.getEndDate(), "BOOKED")));
        blocks.findByListingIdAndEndDateGreaterThanEqualOrderByStartDateAsc(l.getId(), today)
                .forEach(a -> unavailable.add(new DateRange(a.getStartDate(), a.getEndDate(), "BLOCKED")));
        unavailable.sort(Comparator.comparing(DateRange::from));
        List<ReviewDto> latest = reviews.findByListingIdOrderByCreatedAtDesc(l.getId(), PageRequest.of(0, 20))
                .stream().map(mapper::review).toList();
        return new ListingDetail(l.getId(), l.getTitle(), l.getCity(), l.getDistrict(), l.getDailyPrice(),
                l.getDeposit(), l.coverUrl(), mapper.categoryRef(l.getCategory()), l.getRatingAvg(),
                l.getReviewCount(), l.getOwner().getId(), l.getOwner().getFullName(), l.getStatus(),
                l.getCreatedAt(), l.getDescription(), l.getCondition(), l.getMinDays(), l.getMaxDays(),
                l.getPhotos().stream().map(mapper::photo).toList(), mapper.publicUser(l.getOwner()),
                unavailable, latest);
    }

    @Transactional
    public ListingDetail create(ListingRequest req) {
        User owner = users.findById(CurrentUser.id()).orElseThrow(ApiException::unauthorized);
        Listing l = new Listing();
        l.setOwner(owner);
        apply(l, req);
        listings.save(l);
        return toDetail(l);
    }

    @Transactional
    public ListingDetail update(Long id, ListingRequest req) {
        Listing l = owned(id);
        DemoGuard.changeListing(id);
        apply(l, req);
        l.setUpdatedAt(LocalDateTime.now());
        return toDetail(l);
    }

    @Transactional
    public void archive(Long id) {
        Listing l = owned(id);
        DemoGuard.changeListing(id);
        l.setStatus(ListingStatus.ARCHIVED);
        l.setUpdatedAt(LocalDateTime.now());
    }

    @Transactional
    public List<PhotoDto> addPhotos(Long id, List<MultipartFile> files) {
        Listing l = owned(id);
        DemoGuard.changeListing(id);
        if (files == null || files.isEmpty()) throw ApiException.validation("Choose at least one photo");
        if (l.getPhotos().size() + files.size() > MAX_PHOTOS) {
            throw ApiException.validation("A listing can have at most " + MAX_PHOTOS + " photos");
        }
        int order = l.getPhotos().stream().mapToInt(ListingPhoto::getSortOrder).max().orElse(-1) + 1;
        for (MultipartFile f : files) {
            StorageService.StoredFile stored = storage.store(f, "listings/" + l.getId());
            ListingPhoto p = new ListingPhoto();
            p.setListing(l);
            p.setUrl(stored.url());
            p.setStorageKey(stored.key());
            p.setSortOrder(order++);
            l.getPhotos().add(p);
        }
        listings.saveAndFlush(l);
        return l.getPhotos().stream().map(mapper::photo).toList();
    }

    @Transactional
    public void deletePhoto(Long id, Long photoId) {
        Listing l = owned(id);
        DemoGuard.changeListing(id);
        ListingPhoto p = l.getPhotos().stream().filter(x -> x.getId().equals(photoId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Photo"));
        l.getPhotos().remove(p);
        storage.delete(p.getStorageKey());
    }

    @Transactional(readOnly = true)
    public List<BlockDto> listBlocks(Long id) {
        owned(id);
        return blocks.findByListingIdOrderByStartDateAsc(id).stream().map(mapper::block).toList();
    }

    @Transactional
    public BlockDto addBlock(Long id, BlockRequest req) {
        // same lock as bookings so a block and a booking cannot race each other
        Listing l = listings.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Listing"));
        requireOwner(l);
        if (bookings.countOverlapping(id, req.from(), req.to(), Set.of(BookingStatus.ACCEPTED), -1L) > 0) {
            throw ApiException.conflict("These dates overlap an accepted booking");
        }
        AvailabilityBlock a = new AvailabilityBlock();
        a.setListing(l);
        a.setStartDate(req.from());
        a.setEndDate(req.to());
        a.setNote(AuthService.blankToNull(req.note()));
        return mapper.block(blocks.save(a));
    }

    @Transactional
    public void deleteBlock(Long id, Long blockId) {
        owned(id);
        DemoGuard.removeBlock(blockId);
        AvailabilityBlock a = blocks.findById(blockId).filter(x -> x.getListing().getId().equals(id))
                .orElseThrow(() -> ApiException.notFound("Block"));
        blocks.delete(a);
    }

    @Transactional
    public void report(Long id, ReportRequest req) {
        Listing l = listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing"));
        Report r = new Report();
        r.setListing(l);
        r.setReporter(users.getReferenceById(CurrentUser.id()));
        r.setReason(req.reason().trim());
        reports.save(r);
    }

    @Transactional(readOnly = true)
    public List<HostListing> hostListings() {
        Long me = CurrentUser.id();
        return listings.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(me, ListingStatus.ARCHIVED).stream()
                .map(l -> new HostListing(l.getId(), l.getTitle(), l.getCity(), l.getDistrict(), l.getDailyPrice(),
                        l.getDeposit(), l.coverUrl(), mapper.categoryRef(l.getCategory()), l.getRatingAvg(),
                        l.getReviewCount(), me, l.getOwner().getFullName(), l.getStatus(), l.getCreatedAt(),
                        l.getPhotos().size(), bookings.countByListingId(l.getId()),
                        bookings.countByListingIdAndStatus(l.getId(), BookingStatus.REQUESTED)))
                .toList();
    }

    private void apply(Listing l, ListingRequest req) {
        Category c = categories.findById(req.categoryId()).filter(Category::isActive)
                .orElseThrow(() -> ApiException.validation("Unknown category"));
        l.setCategory(c);
        l.setTitle(req.title().trim());
        l.setDescription(req.description().trim());
        l.setCity(req.city().trim());
        l.setDistrict(AuthService.blankToNull(req.district()));
        l.setDailyPrice(req.dailyPrice());
        l.setDeposit(req.deposit());
        l.setCondition(req.condition());
        l.setMinDays(req.minDays());
        l.setMaxDays(req.maxDays());
    }

    private Listing owned(Long id) {
        Listing l = listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing"));
        requireOwner(l);
        if (l.getStatus() == ListingStatus.ARCHIVED) throw ApiException.notFound("Listing");
        return l;
    }

    private void requireOwner(Listing l) {
        if (!l.getOwner().getId().equals(CurrentUser.id())) {
            throw ApiException.forbidden("Only the owner can change this listing");
        }
    }
}
