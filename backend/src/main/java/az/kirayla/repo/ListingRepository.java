package az.kirayla.repo;

import az.kirayla.domain.Listing;
import az.kirayla.domain.ListingStatus;
import az.kirayla.domain.ReportStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ListingRepository extends JpaRepository<Listing, Long>, JpaSpecificationExecutor<Listing> {

    /** Row lock used to serialize bookings on the same listing (SELECT ... FOR UPDATE). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Listing l where l.id = :id")
    Optional<Listing> findByIdForUpdate(@Param("id") Long id);

    List<Listing> findByOwnerIdAndStatusNotOrderByCreatedAtDesc(Long ownerId, ListingStatus status);

    long countByOwnerIdAndStatus(Long ownerId, ListingStatus status);

    long countByOwnerIdAndStatusNot(Long ownerId, ListingStatus status);

    long countByStatus(ListingStatus status);

    /**
     * Candidates for the home page's "newest" cards: listings in {@code status} that have at least one photo,
     * were created at or before {@code createdBefore}, have no report in {@code openReport} status, and are not
     * a listing a visitor added through a shared demo account (owner {@code demoProtected} or {@code demoReadOnly}
     * and an id from {@code firstVisitorId} on; those accounts' seeded catalogue stays eligible).
     * Newest first; ties: higher id first.
     */
    @Query("""
            select l.id from Listing l join l.owner o
            where l.status = :status and l.createdAt <= :createdBefore
              and exists (select p.id from ListingPhoto p where p.listing = l)
              and not ((o.demoProtected = true or o.demoReadOnly = true) and l.id >= :firstVisitorId)
              and not exists (select r.id from Report r where r.listing = l and r.status = :openReport)
            order by l.createdAt desc, l.id desc
            """)
    List<Long> newestHighlightIds(@Param("status") ListingStatus status,
                                  @Param("createdBefore") LocalDateTime createdBefore,
                                  @Param("firstVisitorId") long firstVisitorId,
                                  @Param("openReport") ReportStatus openReport,
                                  Pageable pageable);

    long countByCategoryId(Long categoryId);

    long countByCategoryIdAndStatus(Long categoryId, ListingStatus status);

    @Query("""
            select l from Listing l
            where lower(l.title) like :q or lower(l.owner.fullName) like :q or lower(l.city) like :q
            """)
    Page<Listing> adminSearch(@Param("q") String q, Pageable pageable);

    @Query("""
            select l from Listing l
            where l.status = :status
              and (lower(l.title) like :q or lower(l.owner.fullName) like :q or lower(l.city) like :q)
            """)
    Page<Listing> adminSearchByStatus(@Param("q") String q, @Param("status") ListingStatus status, Pageable pageable);
}
