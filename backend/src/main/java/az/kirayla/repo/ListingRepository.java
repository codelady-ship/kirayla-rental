package az.kirayla.repo;

import az.kirayla.domain.Listing;
import az.kirayla.domain.ListingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Listings in {@code status} that have at least one photo, newest first (ties: higher id first). */
    @Query("""
            select l.id from Listing l
            where l.status = :status and exists (select p.id from ListingPhoto p where p.listing = l)
            order by l.createdAt desc, l.id desc
            """)
    List<Long> newestWithPhotoIds(@Param("status") ListingStatus status, Pageable pageable);

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
