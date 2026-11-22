package az.kirayla.repo;

import az.kirayla.domain.Booking;
import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.ListingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /**
     * Bookings of a listing in the given statuses overlapping the inclusive range [from, to]
     * (b.start <= to AND from <= b.end), excluding one booking id (pass -1 to exclude none).
     */
    @Query("""
            select count(b) from Booking b
            where b.listing.id = :listingId and b.status in :statuses
              and b.startDate <= :to and b.endDate >= :from and b.id <> :excludeId
            """)
    long countOverlapping(@Param("listingId") Long listingId,
                          @Param("from") LocalDate from,
                          @Param("to") LocalDate to,
                          @Param("statuses") Collection<BookingStatus> statuses,
                          @Param("excludeId") Long excludeId);

    @Query("""
            select b from Booking b
            where b.listing.id = :listingId and b.status in :statuses
              and b.startDate <= :to and b.endDate >= :from and b.id <> :excludeId
            """)
    List<Booking> findOverlapping(@Param("listingId") Long listingId,
                                  @Param("from") LocalDate from,
                                  @Param("to") LocalDate to,
                                  @Param("statuses") Collection<BookingStatus> statuses,
                                  @Param("excludeId") Long excludeId);

    List<Booking> findByListingIdAndStatusInAndEndDateGreaterThanEqualOrderByStartDateAsc(
            Long listingId, Collection<BookingStatus> statuses, LocalDate from);

    List<Booking> findByRenterIdOrderByCreatedAtDesc(Long renterId);

    List<Booking> findByListingOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Booking> findByListingOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, BookingStatus status);

    List<Booking> findByListingOwnerIdAndStatusIn(Long ownerId, Collection<BookingStatus> statuses);

    long countByListingId(Long listingId);

    long countByListingIdAndStatus(Long listingId, BookingStatus status);

    long countByRenterId(Long renterId);

    long countByStatus(BookingStatus status);

    @Query("select coalesce(sum(b.rentalTotal), 0) from Booking b where b.status in :statuses")
    BigDecimal sumRentalTotal(@Param("statuses") Collection<BookingStatus> statuses);

    Page<Booking> findByStatus(BookingStatus status, Pageable pageable);

    /**
     * Listings by how often they were rented (bookings in the given statuses), most first; ties: the newer
     * listing first (createdAt), then the higher id. Only listings in {@code listingStatus} that have at least one
     * photo, and never a listing a visitor added through a shared demo account (owner {@code demoProtected} or
     * {@code demoReadOnly} and an id from {@code firstVisitorId} on; those accounts' seeded catalogue stays eligible).
     */
    @Query("""
            select l.id from Booking b join b.listing l join l.owner o
            where b.status in :statuses and l.status = :listingStatus
              and exists (select p.id from ListingPhoto p where p.listing = l)
              and not ((o.demoProtected = true or o.demoReadOnly = true) and l.id >= :firstVisitorId)
            group by l.id, l.createdAt
            order by count(b) desc, l.createdAt desc, l.id desc
            """)
    List<Long> mostRentedListingIds(@Param("statuses") Collection<BookingStatus> statuses,
                                    @Param("listingStatus") ListingStatus listingStatus,
                                    @Param("firstVisitorId") long firstVisitorId, Pageable pageable);

    @Query("select b.listing.id from Booking b where b.id = :id")
    java.util.Optional<Long> findListingId(@Param("id") Long id);
}
