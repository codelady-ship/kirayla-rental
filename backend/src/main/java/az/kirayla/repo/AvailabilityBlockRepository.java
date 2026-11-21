package az.kirayla.repo;

import az.kirayla.domain.AvailabilityBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AvailabilityBlockRepository extends JpaRepository<AvailabilityBlock, Long> {

    List<AvailabilityBlock> findByListingIdOrderByStartDateAsc(Long listingId);

    List<AvailabilityBlock> findByListingIdAndEndDateGreaterThanEqualOrderByStartDateAsc(Long listingId, LocalDate from);

    /** Blocks overlapping the inclusive range [from, to]: a.start <= to AND from <= a.end. */
    @Query("""
            select count(a) from AvailabilityBlock a
            where a.listing.id = :listingId and a.startDate <= :to and a.endDate >= :from
            """)
    long countOverlapping(@Param("listingId") Long listingId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
