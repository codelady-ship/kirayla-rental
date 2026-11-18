package az.kirayla.repo;

import az.kirayla.domain.Booking;
import az.kirayla.domain.BookingStatus;
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
}
